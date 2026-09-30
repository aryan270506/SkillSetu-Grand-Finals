import os
import json
import time
import logging
import urllib.request
import urllib.error
import threading
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger("groq_key_manager")
logger.setLevel(logging.INFO)

@dataclass
class GroqKeyStatus:
    AVAILABLE = "AVAILABLE"
    RATE_LIMITED = "RATE_LIMITED"
    TEMPORARILY_FAILED = "TEMPORARILY_FAILED"
    INVALID = "INVALID"
    DISABLED = "DISABLED"

class GroqKeyInfo:
    def __init__(self, key_id: str, api_key: str):
        self.key_id = key_id
        self.api_key = api_key
        self.status = GroqKeyStatus.AVAILABLE
        self.available_at = 0.0
        
        # Metrics
        self.requests = 0
        self.success = 0
        self.failures = 0
        self.rate_limits = 0
        self.auth_errors = 0

class GroqKeyManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(GroqKeyManager, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self.keys: List[GroqKeyInfo] = []
        self._current_index = 0
        self.load_keys()

    def load_keys(self):
        with self._lock:
            self.keys = []
            try:
                from dotenv import load_dotenv
                load_dotenv()
            except Exception:
                pass
            
            # Find all variables matching GROQ_API_KEY, GROQ_API_KEY_1, etc.
            idx = 1
            for k, v in os.environ.items():
                if k.startswith("GROQ_API_KEY") and v and v.strip():
                    self.keys.append(GroqKeyInfo(f"key_{idx}", v.strip()))
                    idx += 1
            
            if not self.keys:
                # Try fallback to config if env didn't have it directly loaded
                from app.config import settings
                if settings.GROQ_API_KEY and settings.GROQ_API_KEY.strip():
                    self.keys.append(GroqKeyInfo("key_1", settings.GROQ_API_KEY.strip()))
                    
            logger.info(f"[GROQ] Loaded {len(self.keys)} Groq API keys.")

    def _get_available_key(self) -> Optional[GroqKeyInfo]:
        now = time.time()
        with self._lock:
            # First, check if any keys can be recovered
            for k in self.keys:
                if k.status in (GroqKeyStatus.RATE_LIMITED, GroqKeyStatus.TEMPORARILY_FAILED):
                    if now >= k.available_at:
                        k.status = GroqKeyStatus.AVAILABLE
                        k.available_at = 0.0
                        logger.info(f"[GROQ] {k.key_id} recovered and is now AVAILABLE")
            
            # Round-robin select a healthy key
            if not self.keys:
                return None
                
            start_idx = self._current_index
            for _ in range(len(self.keys)):
                k = self.keys[self._current_index]
                self._current_index = (self._current_index + 1) % len(self.keys)
                if k.status == GroqKeyStatus.AVAILABLE:
                    return k
            
            return None

    def execute_with_failover(
        self,
        payload: Dict[str, Any],
        url: str = "https://api.groq.com/openai/v1/chat/completions",
        timeout: int = 15,
        max_attempts: Optional[int] = None
    ) -> Dict[str, Any]:
        if max_attempts is None:
            max_attempts = len(self.keys)
            
        attempts = 0
        used_keys = set()
        
        while attempts < max_attempts:
            key_info = self._get_available_key()
            if not key_info:
                logger.error("[GROQ] All keys failed. No available keys to process request.")
                raise Exception("groq_temporarily_unavailable: AI generation is temporarily unavailable. Please try again later.")
            
            if key_info.key_id in used_keys:
                if len(used_keys) >= len([k for k in self.keys if k.status == GroqKeyStatus.AVAILABLE]) + len(used_keys):
                    break
                    
            used_keys.add(key_info.key_id)
            attempts += 1
            
            logger.info(f"[GROQ] Request started. Using {key_info.key_id}")
            
            with self._lock:
                key_info.requests += 1

            headers = {
                "Authorization": f"Bearer {key_info.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "SkillSetu-Backend/1.0"
            }

            try:
                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode("utf-8"),
                    headers=headers,
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=timeout) as resp:
                    body = resp.read().decode("utf-8")
                    res_data = json.loads(body)
                    
                    with self._lock:
                        key_info.success += 1
                        
                    logger.info(f"[GROQ] {key_info.key_id} request successful")
                    return res_data

            except urllib.error.HTTPError as e:
                with self._lock:
                    key_info.failures += 1
                
                if e.code == 429:
                    retry_after = e.headers.get("Retry-After")
                    try:
                        cooldown = int(retry_after) if retry_after else 30
                    except ValueError:
                        cooldown = 30
                        
                    with self._lock:
                        key_info.status = GroqKeyStatus.RATE_LIMITED
                        key_info.available_at = time.time() + cooldown
                        key_info.rate_limits += 1
                    logger.warning(f"[GROQ] {key_info.key_id} returned 429. Cooldown = {cooldown}s")
                    logger.info(f"[GROQ] Falling back to another key...")
                    continue
                    
                elif e.code in (401, 403):
                    with self._lock:
                        key_info.status = GroqKeyStatus.INVALID
                        key_info.auth_errors += 1
                    logger.error(f"[GROQ] {key_info.key_id} returned {e.code}. Marking INVALID.")
                    logger.info(f"[GROQ] Falling back to another key...")
                    continue
                    
                elif e.code in (500, 502, 503, 504):
                    with self._lock:
                        key_info.status = GroqKeyStatus.TEMPORARILY_FAILED
                        key_info.available_at = time.time() + 15
                    logger.warning(f"[GROQ] {key_info.key_id} returned {e.code}. Temporary cooldown 15s.")
                    logger.info(f"[GROQ] Falling back to another key...")
                    continue
                    
                else:
                    err_msg = e.read().decode("utf-8") if e.fp else str(e)
                    logger.error(f"[GROQ] {key_info.key_id} returned {e.code}: {err_msg}")
                    raise Exception(f"model_error: Groq API Error {e.code}: {err_msg}")

            except urllib.error.URLError as e:
                with self._lock:
                    key_info.failures += 1
                    key_info.status = GroqKeyStatus.TEMPORARILY_FAILED
                    key_info.available_at = time.time() + 10
                logger.warning(f"[GROQ] {key_info.key_id} network/timeout error: {e}. Temporary cooldown 10s.")
                logger.info(f"[GROQ] Falling back to another key...")
                continue
                
            except Exception as e:
                with self._lock:
                    key_info.failures += 1
                logger.error(f"[GROQ] {key_info.key_id} unexpected error: {e}")
                continue

        logger.error("[GROQ] Max attempts reached or all healthy keys exhausted.")
        raise Exception("groq_temporarily_unavailable: AI generation is temporarily unavailable. Please try again later.")

# Global singleton instance
key_manager = GroqKeyManager()
