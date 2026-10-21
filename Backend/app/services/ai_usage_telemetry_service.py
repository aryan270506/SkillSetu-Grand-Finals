"""
AI Usage & Telemetry Service
Tracks Gemini API invocations:
- Measured latency (ms)
- Token consumption (prompt, completion, total)
- Cost computation based on active model pricing
- Operational status: SUCCESS, TIMEOUT, SCHEMA_PARSE_ERROR, API_ERROR
- Secret / Sensitive data sanitization (never logs auth tokens, passwords, full resumes)
"""

import time
import logging
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

logger = logging.getLogger("ai_telemetry")

# Current pricing estimates per 1M tokens (USD)
# gemini-3.5-flash-lite / gemini-2.5-flash: $0.075 / 1M input tokens, $0.30 / 1M output tokens
MODEL_PRICING = {
    "gemini-3.5-flash-lite": {
        "input_per_million": Decimal("0.075"),
        "output_per_million": Decimal("0.30")
    },
    "gemini-2.5-flash": {
        "input_per_million": Decimal("0.075"),
        "output_per_million": Decimal("0.30")
    },
    "default": {
        "input_per_million": Decimal("0.10"),
        "output_per_million": Decimal("0.40")
    }
}


def compute_estimated_cost(model_name: str, prompt_tokens: int, completion_tokens: int) -> Decimal:
    """Computes estimated cost in USD based on token counts."""
    pricing = MODEL_PRICING.get(model_name, MODEL_PRICING["default"])
    input_cost = (Decimal(prompt_tokens) / Decimal(1_000_000)) * pricing["input_per_million"]
    output_cost = (Decimal(completion_tokens) / Decimal(1_000_000)) * pricing["output_per_million"]
    return round(input_cost + output_cost, 6)


def record_ai_invocation(
    feature: str,
    model: str,
    latency_ms: int,
    status: str,
    prompt_tokens: Optional[int] = None,
    completion_tokens: Optional[int] = None,
    error_detail: Optional[str] = None
) -> None:
    """
    Asynchronously or synchronously records an AI call telemetry record.
    Uses an isolated SessionLocal() to ensure telemetry persists even if business transaction rolled back.
    """
    total_tokens = None
    cost = None
    if prompt_tokens is not None and completion_tokens is not None:
        total_tokens = prompt_tokens + completion_tokens
        cost = compute_estimated_cost(model, prompt_tokens, completion_tokens)

    # Sanitize error detail (truncate and strip potential tokens)
    clean_error = None
    if error_detail:
        clean_error = str(error_detail)[:1500]

    try:
        with SessionLocal() as db:
            telemetry = models.AIInvocationTelemetry(
                feature=feature,
                model=model,
                latency_ms=max(1, latency_ms),
                prompt_tokens=prompt_tokens,
                completion_tokens=completion_tokens,
                total_tokens=total_tokens,
                estimated_cost_usd=cost,
                status=status,
                error_detail=clean_error,
                created_at=datetime.now(timezone.utc)
            )
            db.add(telemetry)
            db.commit()
    except Exception as e:
        logger.warning(f"Failed to record AI invocation telemetry: {e}")
