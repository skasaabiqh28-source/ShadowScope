"""
Core configuration settings for the AI Security Testing Platform.

# Pydantic Settings — loads configuration and environment variables with automatic type validation.
"""

import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings
from pydantic import Field


# Determine the user's home directory across operating systems
USER_HOME = Path.home()
DEFAULT_STRIX_EXE = "C:\\Users\\saabi\\AppData\\Local\\Programs\\Python\\Python313\\Scripts\\strix.exe"


class Settings(BaseSettings):
    """
    Central application configuration.
    Values can be overridden using environment variables or a .env file.
    """
    # Application metadata
    APP_NAME: str = "AI Security Testing Platform"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    
    # Path to the actual Strix CLI executable (Windows .exe or PATH binary)
    # Subprocess will invoke this exact path without needing a shell.
    STRIX_EXECUTABLE: str = Field(
        default_factory=lambda: DEFAULT_STRIX_EXE if os.path.exists(DEFAULT_STRIX_EXE) else "strix"
    )

    # Database URL
    # SQLAlchemy ORM uses this connection string. 'aiosqlite' provides async SQLite support.
    DATABASE_URL: str = "sqlite+aiosqlite:///./security_platform.db"

    # Directory where scan runs and artifacts are placed
    SCANS_RUN_DIR: str = "./strix_runs"

    # Directory where generated security reports (HTML, PDF, JSON) will be stored
    REPORTS_DIR: str = "./reports"

    # CORS origins: Cross-Origin Resource Sharing controls which frontend URLs can call our API.
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # LLM Provider Configuration
    # Modes: "AUTO" (Gemini with Ollama fallback), "GEMINI" (only Gemini), "OLLAMA" (local only)
    LLM_PROVIDER_MODE: str = "AUTO"
    
    # Primary provider (Google Gemini)
    PRIMARY_LLM_PROVIDER: str = "GEMINI"
    GEMINI_MODEL: str = "openai/gemini-3.8-flash"
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_API_BASE: str = "https://generativelanguage.googleapis.com/v1beta/openai/"
    GEMINI_COOLDOWN_SECONDS: int = 600  # 10 minutes cooldown upon HTTP 429 / Quota Exceeded

    # Fallback provider (Ollama local inference)
    FALLBACK_LLM_PROVIDER: str = "OLLAMA"
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.2"  # or deepseek-r1, mistral, etc.

    # External directories from which to auto-discover previous Strix runs
    # This allows viewing real existing scans (like the adjacent SignBridgeAI scan) immediately.
    DISCOVERY_RUNS_DIRS: List[str] = [
        "./strix_runs",
        "C:\\Users\\saabi\\OneDrive\\Desktop\\SignBridgeAI\\strix_runs",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


# Instantiate a singleton settings object
settings = Settings()

# Ensure required runtime folders exist
os.makedirs(settings.SCANS_RUN_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
