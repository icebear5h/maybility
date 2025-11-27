"""
Comprehensive logging configuration with loguru
"""

import sys
import os
from pathlib import Path
from loguru import logger
from typing import Optional


# Create logs directory
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Remove default logger
logger.remove()


def setup_logging(
    level: str = "INFO",
    log_to_file: bool = True,
    log_to_console: bool = True,
    json_logs: bool = False
):
    """
    Configure loguru logging with multiple handlers

    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Enable file logging
        log_to_console: Enable console logging
        json_logs: Use JSON format (for production)
    """

    # Console handler (rich formatting for development)
    if log_to_console:
        logger.add(
            sys.stdout,
            format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - <level>{message}</level>",
            level=level,
            colorize=True,
            backtrace=True,
            diagnose=True
        )

    # File handler - General logs
    if log_to_file:
        logger.add(
            LOGS_DIR / "app.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level=level,
            rotation="100 MB",  # Rotate when file reaches 100MB
            retention="30 days",  # Keep logs for 30 days
            compression="zip",  # Compress rotated logs
            backtrace=True,
            diagnose=True
        )

    # File handler - Error logs only
    if log_to_file:
        logger.add(
            LOGS_DIR / "errors.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}",
            level="ERROR",
            rotation="50 MB",
            retention="90 days",  # Keep error logs longer
            compression="zip",
            backtrace=True,
            diagnose=True
        )

    # File handler - Agent logs (separate for analysis)
    if log_to_file:
        logger.add(
            LOGS_DIR / "agents.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {extra[agent]} | {message}",
            level="INFO",
            filter=lambda record: "agent" in record["extra"],
            rotation="50 MB",
            retention="14 days",
            compression="zip"
        )

    # File handler - API requests (for monitoring)
    if log_to_file:
        logger.add(
            LOGS_DIR / "api.log",
            format="{time:YYYY-MM-DD HH:mm:ss} | {extra[method]} {extra[path]} | Status: {extra[status_code]} | Duration: {extra[duration]}ms",
            level="INFO",
            filter=lambda record: "api_request" in record["extra"],
            rotation="100 MB",
            retention="14 days",
            compression="zip"
        )

    # JSON logs for production (structured logging)
    if json_logs and log_to_file:
        logger.add(
            LOGS_DIR / "app.json",
            format="{message}",
            level=level,
            rotation="100 MB",
            retention="30 days",
            compression="zip",
            serialize=True  # JSON format
        )

    logger.info(f"Logging configured: level={level}, file={log_to_file}, console={log_to_console}")


def get_logger(name: str):
    """
    Get a logger instance with context

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    return logger.bind(name=name)


# Context managers for structured logging
class LogContext:
    """Context manager for adding extra context to logs"""

    def __init__(self, **kwargs):
        self.context = kwargs
        self.token = None

    def __enter__(self):
        self.token = logger.contextualize(**self.context)
        return logger

    def __exit__(self, exc_type, exc_val, exc_tb):
        if exc_type:
            logger.exception(f"Exception in context {self.context}")
        return False


# Convenience functions for common log patterns
def log_api_request(method: str, path: str, status_code: int, duration_ms: float):
    """Log API request with structured data"""
    logger.bind(
        api_request=True,
        method=method,
        path=path,
        status_code=status_code,
        duration=round(duration_ms, 2)
    ).info(f"{method} {path} - {status_code} ({duration_ms}ms)")


def log_agent_action(agent_name: str, action: str, details: Optional[dict] = None):
    """Log agent action with context"""
    logger.bind(agent=agent_name).info(
        f"Agent action: {action}" + (f" | {details}" if details else "")
    )


def log_db_query(table: str, operation: str, duration_ms: float):
    """Log database query"""
    logger.bind(
        db_query=True,
        table=table,
        operation=operation,
        duration=round(duration_ms, 2)
    ).debug(f"DB {operation} on {table} ({duration_ms}ms)")


# Initialize logging with environment variables
def init_logging():
    """Initialize logging from environment variables"""
    level = os.getenv("LOG_LEVEL", "INFO")
    log_to_file = os.getenv("LOG_TO_FILE", "true").lower() == "true"
    log_to_console = os.getenv("LOG_TO_CONSOLE", "true").lower() == "true"
    json_logs = os.getenv("JSON_LOGS", "false").lower() == "true"

    setup_logging(
        level=level,
        log_to_file=log_to_file,
        log_to_console=log_to_console,
        json_logs=json_logs
    )


# Auto-initialize on import
init_logging()
