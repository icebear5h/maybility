# core/cache.py
import json, time, hashlib, os, redis
from jose import jwt

r = redis.from_url(os.environ["REDIS_URL"], decode_responses=True)

def _k(token: str) -> str:
    return "userctx:" + hashlib.sha256(token.encode()).hexdigest()

def get_user_context(access_token: str) -> dict:
    cached = r.get(_k(access_token))
    if cached:
        return json.loads(cached)
    claims = jwt.get_unverified_claims(access_token)  # or verify via JWKS
    ctx = {"user_id": claims.get("sub"), "exp": claims.get("exp")}
    ttl = max(60, ctx["exp"] - int(time.time()) - 30)
    r.setex(_k(access_token), ttl, json.dumps(ctx))
    return ctx