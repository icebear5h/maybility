"""
FastAPI middleware for request/response logging
"""

import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from app.core.logging import log_api_request, logger


class LoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to log all HTTP requests and responses
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        """
        Log request and response details
        """
        # Start timer
        start_time = time.time()

        # Extract request details
        method = request.method
        path = request.url.path
        client_ip = request.client.host if request.client else "unknown"

        # Log request start
        logger.debug(f"→ {method} {path} from {client_ip}")

        # Process request
        try:
            response = await call_next(request)

            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log successful response
            log_api_request(
                method=method,
                path=path,
                status_code=response.status_code,
                duration_ms=duration_ms
            )

            # Add custom headers
            response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

            return response

        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000

            # Log error
            logger.error(f"✗ {method} {path} - Error: {str(e)} ({duration_ms}ms)")

            # Re-raise exception
            raise
