"""
Automated tests for path, URL, and repository security validation.
"""

import pytest
from backend.core.security import (
    validate_local_path,
    validate_web_url,
    validate_github_repo,
    sanitize_argument,
)


def test_validate_local_path_valid():
    # Test valid existing path
    is_valid, path, t_type = validate_local_path(".")
    assert is_valid is True
    assert t_type == "directory"


def test_validate_local_path_nonexistent():
    is_valid, err, _ = validate_local_path("C:\\non_existent_folder_xyz_123")
    assert is_valid is False
    assert "does not exist" in err.lower()


def test_validate_local_path_forbidden_system_root():
    is_valid, err, _ = validate_local_path("C:\\Windows")
    assert is_valid is False
    assert "prohibited" in err.lower() or "forbidden" in err.lower()


def test_validate_web_url_valid():
    is_valid, url = validate_web_url("https://example.com/app")
    assert is_valid is True
    assert url == "https://example.com/app"


def test_validate_web_url_invalid_scheme():
    is_valid, err = validate_web_url("ftp://example.com/app")
    assert is_valid is False
    assert "only http and https" in err.lower()


def test_validate_web_url_cloud_metadata_blocked():
    is_valid, err = validate_web_url("http://169.254.169.254/latest/meta-data")
    assert is_valid is False
    assert "prohibited" in err.lower()


def test_validate_github_repo_valid():
    is_valid, repo = validate_github_repo("https://github.com/usestrix/strix")
    assert is_valid is True
    assert "strix" in repo


def test_validate_github_repo_invalid():
    is_valid, err = validate_github_repo("https://notgithub.com/someone/repo")
    assert is_valid is False


def test_sanitize_argument():
    clean = sanitize_argument("test\x00arg; rm -rf /")
    assert "\x00" not in clean
