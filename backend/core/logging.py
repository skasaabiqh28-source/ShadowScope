"""
Structured and sanitized logging module.

# Secret Redaction — masks passwords, bearer tokens, and API keys to prevent accidental leaks in logs.
"""

import logging
import re
import sys
from typing import Any

# Regular expressions to identify sensitive tokens, keys, and credentials
REDACTION_PATTERNS = [
    # Gemini / OpenAI / Generic API key patterns
    re.compile(r"(AQ\.[A-Za-z0-9_\-]{20,})", re.IGNORECASE),
    re.compile(r"(AIza[0-9A-Za-z-_]{35})", re.IGNORECASE),
    re.compile(r"(sk-[A-Za-z0-9]{20,})", re.IGNORECASE),
    # Bearer tokens and Authorization headers
    re.compile(r"(Bearer\s+)([A-Za-z0-9\-._~+/]+=*)", re.IGNORECASE),
    # Passwords or secrets in query strings or json fields
    re.compile(r'(["\']?(?:password|secret|api_key|token|access_token)["\']?\s*[:=]\s*["\'])([^"\']{3,})(["\'])', re.IGNORECASE),
]


def redact_secrets(text: str) -> str:
    """
    Sanitize a string by replacing potential API keys, passwords, and tokens with [REDACTED].
    """
    if not isinstance(text, str):
        text = str(text)
    sanitized = text
    for pattern in REDACTION_PATTERNS:
        # Check if the regex pattern has multiple groups (e.g., prefix + secret + suffix)
        if pattern.groups == 3:
            sanitized = pattern.sub(r"\g<1>[REDACTED]\g<3>", sanitized)
        elif pattern.groups == 2:
            sanitized = pattern.sub(r"\g<1>[REDACTED]", sanitized)
        else:
            sanitized = pattern.sub("[REDACTED]", sanitized)
    return sanitized


class RedactingFormatter(logging.Formatter):
    """
    Custom logging formatter that applies secret redaction to every output line.
    """
    def format(self, record: logging.LogRecord) -> str:
        original = super().format(record)
        return redact_secrets(original)


def setup_logger(name: str = "security_platform", level: int = logging.INFO) -> logging.Logger:
    """
    Create a configured logger with secret redaction and clean console output.
    """
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(level)
        handler = logging.StreamHandler(sys.stdout)
        # Standard structured format: timestamp | level | component | message
        formatter = RedactingFormatter(
            fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.propagate = False
    return logger


# Global application logger
logger = setup_logger()
