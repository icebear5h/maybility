# core/cache.py
import json
import time
import hashlib
import os
from jose import jwt
from dotenv import load_dotenv

load_dotenv()

# Redis is optional - works without it (just no caching)
_redis_client = None
REDIS_URL = os.environ.get("REDIS_URL", "")

if REDIS_URL:
    try:
        import redis
        _redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        _redis_client.ping()  # Test connection
    except Exception as e:
        print(f"Warning: Redis unavailable ({e}), running without cache")
        _redis_client = None


def _k(token: str) -> str:
    return "userctx:" + hashlib.sha256(token.encode()).hexdigest()


def get_user_context(access_token: str) -> dict:
    """
    Get user context from JWT token.
    Uses Redis cache if available, otherwise decodes directly.
    """
    # Try cache first
    if _redis_client:
        try:
            cached = _redis_client.get(_k(access_token))
            if cached:
                return json.loads(cached)
        except Exception:
            pass  # Fall through to decode

    # Decode JWT directly
    claims = jwt.get_unverified_claims(access_token)
    ctx = {"user_id": claims.get("sub"), "exp": claims.get("exp")}

    # Cache if Redis available
    if _redis_client and ctx.get("exp"):
        try:
            ttl = max(60, ctx["exp"] - int(time.time()) - 30)
            _redis_client.setex(_k(access_token), ttl, json.dumps(ctx))
        except Exception:
            pass  # Caching failed, continue anyway

    return ctx
