"""
LLM Provider Manager — handles automatic switching between Google Gemini and local Ollama.

# Failover Strategy — automatically redirecting requests to a backup system when the primary fails.
# Circuit Breaker / Cooldown Pattern — temporarily stopping calls to an exhausted service to prevent repetitive errors.
"""

import os
import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Tuple, Dict, Any, List, Optional

from backend.core.config import settings
from backend.core.logging import logger, redact_secrets
from backend.integrations.llm.gemini_client import GeminiClient
from backend.integrations.llm.ollama_client import OllamaClient


class LLMProviderManager:
    """
    Coordinates AI model providers for both the Strix security engine and the internal AI Assistant.
    Provides automatic fallback: Gemini (primary) -> Ollama (local fallback) on HTTP 429 or outages.
    """

    def __init__(self):
        self.mode = settings.LLM_PROVIDER_MODE.upper()  # "AUTO", "GEMINI", "OLLAMA"
        self.gemini = GeminiClient()
        self.ollama = OllamaClient()

        # Cooldown state tracking
        self.gemini_cooldown_until: float = 0.0
        self.gemini_last_error: Optional[str] = None
        self.fallback_history: List[Dict[str, Any]] = []

    def set_mode(self, mode: str, ollama_url: Optional[str] = None, ollama_model: Optional[str] = None) -> None:
        """
        Updates provider mode and optional configuration at runtime.
        """
        clean_mode = mode.upper().strip()
        if clean_mode in ["AUTO", "GEMINI", "OLLAMA"]:
            self.mode = clean_mode
            logger.info(f"LLM Provider mode updated to: {self.mode}")
        if ollama_url:
            self.ollama.base_url = ollama_url.rstrip("/")
        if ollama_model:
            self.ollama.model = ollama_model

    def is_gemini_in_cooldown(self) -> Tuple[bool, int]:
        """
        Returns: (in_cooldown: bool, remaining_seconds: int)
        """
        now = time.time()
        if now < self.gemini_cooldown_until:
            remaining = int(self.gemini_cooldown_until - now)
            return True, remaining
        return False, 0

    def trigger_gemini_cooldown(self, reason: str = "Quota Exceeded (HTTP 429)") -> None:
        """
        Places Gemini in cooldown mode for the configured duration.
        """
        self.gemini_cooldown_until = time.time() + settings.GEMINI_COOLDOWN_SECONDS
        self.gemini_last_error = reason
        
        event = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "from_provider": "GEMINI",
            "to_provider": "OLLAMA",
            "cooldown_seconds": settings.GEMINI_COOLDOWN_SECONDS,
        }
        self.fallback_history.append(event)
        logger.warning(
            f"Gemini quota exhausted ({reason}). Switching to Ollama local fallback. "
            f"Gemini cooldown active for {settings.GEMINI_COOLDOWN_SECONDS}s."
        )

    def determine_active_provider(self) -> str:
        """
        Determines which provider to use based on mode and cooldown state.
        Returns 'GEMINI' or 'OLLAMA'.
        """
        if self.mode == "OLLAMA":
            return "OLLAMA"
        if self.mode == "GEMINI":
            return "GEMINI"

        # AUTO Mode
        in_cooldown, _ = self.is_gemini_in_cooldown()
        if in_cooldown:
            return "OLLAMA"
        return "GEMINI"

    def generate_strix_config(self, destination_dir: str) -> Tuple[str, str, Dict[str, str]]:
        """
        Generates a custom Strix JSON config file for the run, configured with the active LLM provider.
        Returns: (path_to_config_file, active_provider_name, env_vars_dict)
        """
        active_provider = self.determine_active_provider()
        config_path = os.path.join(destination_dir, "strix-cli-config.json")

        if active_provider == "GEMINI":
            api_key = self.gemini.api_key or ""
            env_vars = {
                "STRIX_LLM": settings.GEMINI_MODEL,
                "GEMINI_API_KEY": api_key,
                "LLM_API_KEY": api_key,
            }
            # Only supply LLM_API_BASE for OpenAI-compatible proxies.
            # Native Gemini models (gemini/...) route directly via LiteLLM to Google's API.
            if settings.GEMINI_MODEL.startswith("openai/") and settings.GEMINI_API_BASE:
                env_vars["LLM_API_BASE"] = settings.GEMINI_API_BASE
        else:
            # OLLAMA configuration
            model_name = f"ollama/{self.ollama.model}"
            env_vars = {
                "STRIX_LLM": model_name,
                "LLM_API_BASE": self.ollama.base_url,
            }

        config_data = {"env": env_vars}

        os.makedirs(destination_dir, exist_ok=True)
        with open(config_path, "w", encoding="utf-8") as f:
            json.dump(config_data, f, indent=2)

        logger.info(f"Prepared Strix run config [{active_provider}] -> {config_path}")
        return config_path, active_provider, env_vars

    async def generate_assistant_response(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Tuple[str, str, bool]:
        """
        Generates text using the active provider with automatic fallback on 429 or server errors.
        Returns: (response_text, provider_used, success)
        """
        active = self.determine_active_provider()

        # If Gemini is designated first
        if active == "GEMINI":
            success, text, status_code = await self.gemini.generate_response(prompt, system_prompt)
            if success:
                return text, "GEMINI", True
            
            # Check for quota exhaustion / HTTP 429
            if status_code == 429 or "quota" in text.lower():
                self.trigger_gemini_cooldown(f"HTTP 429 Quota Exceeded: {text}")
                if self.mode == "AUTO":
                    logger.info("Falling back immediately to local Ollama for assistant response...")
                    o_success, o_text, _ = await self.ollama.generate_response(prompt, system_prompt)
                    if o_success:
                        return o_text, "OLLAMA (Fallback)", True
                    return (
                        f"Primary provider (Gemini) quota exceeded, and local fallback (Ollama) failed: {o_text}",
                        "OLLAMA",
                        False,
                    )
            
            # For 5xx or transient errors, perform one controlled retry before falling back
            if self.mode == "AUTO":
                logger.info(f"Gemini error ({text}). Attempting fallback to Ollama...")
                o_success, o_text, _ = await self.ollama.generate_response(prompt, system_prompt)
                if o_success:
                    return o_text, "OLLAMA (Fallback)", True

            return text, "GEMINI", False

        # If Ollama is active
        o_success, o_text, _ = await self.ollama.generate_response(prompt, system_prompt)
        return o_text, "OLLAMA", o_success

    async def get_provider_status(self) -> Dict[str, Any]:
        """
        Returns full diagnostic status for dashboard display.
        """
        active = self.determine_active_provider()
        in_cooldown, remaining = self.is_gemini_in_cooldown()

        # Probe health asynchronously
        gemini_ok, gemini_msg = await self.gemini.check_health()
        ollama_ok, ollama_msg = await self.ollama.check_health()

        gemini_status_str = "Cooldown" if in_cooldown else ("Available" if gemini_ok else gemini_msg)
        ollama_status_str = "Available" if ollama_ok else "Offline"

        return {
            "active_provider": active,
            "mode": self.mode,
            "gemini_status": gemini_status_str,
            "gemini_cooldown_remaining_seconds": remaining,
            "gemini_last_error": self.gemini_last_error,
            "gemini_model": settings.GEMINI_MODEL,
            "ollama_status": ollama_status_str,
            "ollama_url": self.ollama.base_url,
            "ollama_model": self.ollama.model,
            "fallback_history": self.fallback_history[-10:],  # last 10 fallback events
        }


# Global provider manager instance
provider_manager = LLMProviderManager()
