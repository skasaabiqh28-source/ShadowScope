"""
Core configuration settings for the AI Security Testing Platform.

# Pydantic Settings — loads configuration and environment variables with automatic type validation.
"""

import os
import sys
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


# Determine the user's home directory across operating systems
USER_HOME = Path.home()

# Detect Render deployment environment
IS_RENDER = os.environ.get("RENDER", "").lower() in ("true", "1", "yes")


def _default_strix_exe() -> str:
    """Resolve the default Strix executable path cross-platform."""
    import shutil

    # 1. Check PATH first (works on both Linux/Render and Windows)
    which = shutil.which("strix") or shutil.which("strix.exe")
    if which:
        return which

    # 2. Windows-specific fallback for local development
    if sys.platform == "win32":
        candidates = [
            Path.home() / "AppData" / "Local" / "Programs" / "Python" / "Python313" / "Scripts" / "strix.exe",
            Path(os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python313\Scripts\strix.exe")),
        ]
        for p in candidates:
            if p.is_file():
                return str(p)

    # 3. Default — hope it's on PATH at runtime
    return "strix"


def _default_db_url() -> str:
    """
    On Render (ephemeral filesystem), place the DB in /tmp so it's writable.
    Locally, use the project directory.
    """
    if IS_RENDER:
        return "sqlite+aiosqlite:////tmp/security_platform.db"
    return "sqlite+aiosqlite:///./security_platform.db"


def _default_cors_origins() -> List[str]:
    """
    Build CORS origins list. Always includes localhost for local dev.
    On Render, also includes the FRONTEND_ORIGIN env var if set.
    """
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    # On Render, the frontend is served from the same origin,
    # but allow an explicit override for custom domains.
    frontend_origin = os.environ.get("FRONTEND_ORIGIN", "").strip()
    if frontend_origin and frontend_origin not in origins:
        origins.append(frontend_origin)
    return origins


def _default_discovery_dirs() -> List[str]:
    """
    On Render, only look in the local strix_runs folder.
    Locally on Windows, also include any adjacent project scan directories.
    """
    dirs = ["./strix_runs"]
    if sys.platform == "win32" and not IS_RENDER:
        extra = r"C:\Users\saabi\OneDrive\Desktop\SignBridgeAI\strix_runs"
        if os.path.isdir(extra):
            dirs.append(extra)
    return dirs


class Settings(BaseSettings):
    """
    Central application configuration.
    Values can be overridden using environment variables or a .env file.
    """
    # Application metadata
    APP_NAME: str = "AI Security Testing Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Render deployment flag
    RENDER: bool = Field(default_factory=lambda: IS_RENDER)

    # Server port (Render sets PORT dynamically)
    PORT: int = Field(default_factory=lambda: int(os.environ.get("PORT", "8000")))

    # Path to the actual Strix CLI executable
    STRIX_EXECUTABLE: str = Field(default_factory=_default_strix_exe)

    # Database URL
    DATABASE_URL: str = Field(default_factory=_default_db_url)

    # Directory where scan runs and artifacts are placed
    SCANS_RUN_DIR: str = "./strix_runs"

    # Directory where generated security reports (HTML, PDF, JSON) will be stored
    REPORTS_DIR: str = "./reports"

    # CORS origins
    CORS_ORIGINS: List[str] = Field(default_factory=_default_cors_origins)

    # LLM Provider Configuration
    # Modes: "AUTO" (Gemini with Ollama fallback), "GEMINI" (only Gemini), "OLLAMA" (local only)
    LLM_PROVIDER_MODE: str = "AUTO"

    # Primary provider (Google Gemini)
    PRIMARY_LLM_PROVIDER: str = "GEMINI"
    GEMINI_MODEL: str = "gemini/gemini-3.6-flash"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    GEMINI_COOLDOWN_SECONDS: int = 600  # 10 minutes cooldown upon HTTP 429 / Quota Exceeded

    # Fallback provider (Ollama local inference)
    FALLBACK_LLM_PROVIDER: str = "OLLAMA"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"  # or deepseek-r1, mistral, etc.

    # External directories from which to auto-discover previous Strix runs
    DISCOVERY_RUNS_DIRS: List[str] = Field(default_factory=_default_discovery_dirs)

    DEFAULT_SCAN_MODE: str = "deep"
    DEFAULT_MAX_BUDGET: Optional[float] = None
    DEFAULT_MAX_TURNS: Optional[int] = None

    # Optional: explicit frontend origin for CORS on Render custom domains
    FRONTEND_ORIGIN: Optional[str] = None

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Instantiate a singleton settings object
settings = Settings()

# Ensure required runtime folders exist
os.makedirs(settings.SCANS_RUN_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
