import hashlib
import os

def hash_password(password: str) -> str:
    """Hash password using SHA-256 with a salt."""
    salt = os.urandom(16)
    pw_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return f"{salt.hex()}:{pw_hash.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against SHA-256 salted hash."""
    try:
        salt_hex, pw_hash_hex = hashed_password.split(':')
        salt = bytes.fromhex(salt_hex)
        expected_hash = hashlib.pbkdf2_hmac('sha256', plain_password.encode('utf-8'), salt, 100000)
        return expected_hash.hex() == pw_hash_hex
    except Exception:
        return False
