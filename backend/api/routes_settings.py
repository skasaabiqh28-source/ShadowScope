"""
API Routes for System Settings and Infrastructure Diagnostics.

# Environment Auditing — inspecting local system capabilities (Docker daemon, Strix binary) to ensure prerequisites are satisfied.
# Secret Masking — displaying 'Configured' or 'Not Configured' rather than leaking real keys to the frontend.
"""

import os
import shutil
import subprocess
from fastapi import APIRouter
from pydantic import BaseModel

from backend.core.config import settings
from backend.core.logging import logger
from backend.integrations.strix.strix_runner import resolve_strix_executable

router = APIRouter(prefix="/api/settings", tags=["Settings"])


def check_docker_status() -> bool:
    """
    Checks if Docker Desktop or daemon is installed and actively responding.
    """
    docker_bin = shutil.which("docker")
    if not docker_bin:
        return False
    try:
        res = subprocess.run(
            [docker_bin, "info"],
            capture_output=True,
            timeout=3.0,
            text=True,
        )
        return res.returncode == 0
    except Exception:
        return False


def get_strix_version() -> str:
    """
    Checks Strix CLI version.
    """
    try:
        exe = resolve_strix_executable()
        res = subprocess.run([exe, "--version"], capture_output=True, text=True, timeout=3.0)
        return res.stdout.strip() or "Installed"
    except Exception as exc:
        return f"Not available: {exc}"


@router.get("")
async def get_system_settings():
    """
    Returns platform settings and infrastructure health without revealing secrets.
    """
    strix_found = False
    strix_path = "Not found"
    try:
        resolved = resolve_strix_executable()
        strix_found = True
        strix_path = resolved
    except Exception:
        pass

    docker_running = check_docker_status()
    strix_version = get_strix_version() if strix_found else "Not installed"

    # Mask database URL
    db_masked = settings.DATABASE_URL
    if "@" in db_masked:
        # Hide password in connection strings like postgres://user:pass@host/db
        db_masked = db_masked.split("@")[-1]

    # Mask API keys
    gemini_key_configured = bool(
        settings.GEMINI_API_KEY
        or os.environ.get("GEMINI_API_KEY")
        or os.environ.get("LLM_API_KEY")
    )

    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "strix_executable_path": strix_path,
        "strix_available": strix_found,
        "strix_version": strix_version,
        "docker_running": docker_running,
        "docker_status_text": "Running" if docker_running else "Not Running",
        "database_url": db_masked,
        "reports_dir": settings.REPORTS_DIR,
        "scans_run_dir": settings.SCANS_RUN_DIR,
        "llm_provider_mode": settings.LLM_PROVIDER_MODE,
        "gemini_api_key_status": "Configured" if gemini_key_configured else "Not Configured",
        "gemini_model": settings.GEMINI_MODEL,
        "ollama_url": settings.OLLAMA_BASE_URL,
        "ollama_model": settings.OLLAMA_MODEL,
        "default_scan_mode": getattr(settings, "DEFAULT_SCAN_MODE", "deep"),
        "default_max_budget": getattr(settings, "DEFAULT_MAX_BUDGET", None),
        "default_max_turns": getattr(settings, "DEFAULT_MAX_TURNS", None),
    }


@router.patch("")
async def update_system_settings(payload: dict):
    """
    Updates configurable system defaults (scan mode, max budget, turns, reports dir, Strix path).
    """
    if "strix_executable_path" in payload and payload["strix_executable_path"]:
        settings.STRIX_EXECUTABLE = payload["strix_executable_path"]
    if "default_scan_mode" in payload and payload["default_scan_mode"]:
        settings.DEFAULT_SCAN_MODE = payload["default_scan_mode"]
    if "default_max_budget" in payload:
        settings.DEFAULT_MAX_BUDGET = payload["default_max_budget"]
    if "default_max_turns" in payload:
        settings.DEFAULT_MAX_TURNS = payload["default_max_turns"]
    if "reports_dir" in payload and payload["reports_dir"]:
        settings.REPORTS_DIR = payload["reports_dir"]
        os.makedirs(settings.REPORTS_DIR, exist_ok=True)

    return await get_system_settings()

