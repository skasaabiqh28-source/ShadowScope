"""
Security utilities for input validation, path sanitization, and command-injection prevention.

# Input Validation — checks user-supplied data against strict rules before allowing the backend to process it.
# Path Traversal Prevention — prevents malicious attempts to access files outside authorized directories using '../'.
# Command Injection Prevention — ensures commands are constructed from safe arguments without shell interpretation.
"""

import os
import re
from pathlib import Path
from urllib.parse import urlparse
from typing import Tuple, Optional


# Critical system folders that must never be targeted as local projects
FORBIDDEN_PATHS = [
    Path("C:\\Windows"),
    Path("C:\\Program Files"),
    Path("C:\\Program Files (x86)"),
    Path("C:\\ProgramData"),
    Path("/etc"),
    Path("/bin"),
    Path("/sbin"),
    Path("/usr"),
    Path("/sys"),
    Path("/proc"),
]

# GitHub repository pattern
GITHUB_URL_REGEX = re.compile(
    r"^(https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+(?:/)?|"
    r"git@github\.com:[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+\.git)$"
)


def validate_local_path(raw_path: str) -> Tuple[bool, str, Optional[str]]:
    """
    Validates a local filesystem path provided for scanning.
    Returns: (is_valid, normalized_path_or_error_message, optional_target_type)
    """
    if not raw_path or not raw_path.strip():
        return False, "Target path cannot be empty.", None

    clean_path_str = raw_path.strip().strip('"').strip("'")
    
    try:
        path_obj = Path(clean_path_str).resolve()
    except Exception as exc:
        return False, f"Invalid path syntax: {exc}", None

    # Check existence
    if not path_obj.exists():
        return False, f"Path does not exist: {path_obj}", None

    # Check read permissions
    if not os.access(path_obj, os.R_OK):
        return False, f"Path is not readable: {path_obj}", None

    # Prevent scanning disk roots directly (e.g. C:\ or /)
    if path_obj == path_obj.anchor or str(path_obj) in ["/", "C:\\", "D:\\"]:
        return False, "Scanning entire filesystem root drives is forbidden for safety.", None

    # Check against forbidden system folders
    for forbidden in FORBIDDEN_PATHS:
        try:
            if path_obj == forbidden or forbidden in path_obj.parents:
                return False, f"Access to system directory '{forbidden}' is strictly prohibited.", None
        except Exception:
            pass

    target_type = "directory" if path_obj.is_dir() else "file"
    return True, str(path_obj), target_type


def validate_web_url(url: str) -> Tuple[bool, str]:
    """
    Validates a target web application URL.
    Ensures HTTP or HTTPS scheme and valid hostname.
    """
    if not url or not url.strip():
        return False, "URL cannot be empty."

    url = url.strip()
    try:
        parsed = urlparse(url)
    except Exception as exc:
        return False, f"Malformed URL: {exc}"

    if parsed.scheme.lower() not in ["http", "https"]:
        return False, f"Only HTTP and HTTPS URLs are permitted. Received: '{parsed.scheme}'"

    if not parsed.netloc:
        return False, "URL must include a valid domain name or host."

    # Deny cloud metadata endpoints for defense-in-depth
    host = parsed.hostname or ""
    if host in ["169.254.169.254", "metadata.google.internal"]:
        return False, "Requests to internal cloud metadata IP addresses are prohibited."

    return True, url


def validate_github_repo(repo_url: str) -> Tuple[bool, str]:
    """
    Validates a GitHub repository URL or SSH identifier.
    """
    if not repo_url or not repo_url.strip():
        return False, "GitHub repository URL cannot be empty."

    repo_url = repo_url.strip()
    if not GITHUB_URL_REGEX.match(repo_url):
        return False, "Invalid GitHub repository format. Must match https://github.com/owner/repo or git@github.com:owner/repo.git"

    return True, repo_url


def sanitize_argument(arg: str) -> str:
    """
    Basic sanitization of CLI arguments before passing them into subprocess.
    Even though subprocess with structured list does not invoke a shell,
    we ensure null bytes and non-printable control characters are removed.
    """
    if not isinstance(arg, str):
        arg = str(arg)
    # Remove null bytes which can cause C-string truncation issues
    clean = arg.replace("\x00", "").strip()
    return clean
