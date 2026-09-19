"""
Automated tests for Gemini to Ollama automatic LLM provider failover.
"""

import time
import pytest
from unittest.mock import AsyncMock, patch

from backend.integrations.llm.provider_manager import LLMProviderManager


def test_provider_mode_switching():
    mgr = LLMProviderManager()
    assert mgr.mode in ["AUTO", "GEMINI", "OLLAMA"]

    mgr.set_mode("OLLAMA")
    assert mgr.mode == "OLLAMA"
    assert mgr.determine_active_provider() == "OLLAMA"

    mgr.set_mode("GEMINI")
    assert mgr.mode == "GEMINI"
    assert mgr.determine_active_provider() == "GEMINI"

    mgr.set_mode("AUTO")
    assert mgr.mode == "AUTO"


def test_gemini_cooldown_and_failover():
    mgr = LLMProviderManager()
    mgr.set_mode("AUTO")

    # Initial state without errors: should pick GEMINI
    assert mgr.determine_active_provider() == "GEMINI"

    # Simulate HTTP 429 quota exhaustion
    mgr.trigger_gemini_cooldown("HTTP 429 Resource Exhausted")

    in_cooldown, remaining = mgr.is_gemini_in_cooldown()
    assert in_cooldown is True
    assert remaining > 0
    assert len(mgr.fallback_history) > 0

    # In AUTO mode with active cooldown, active provider must be OLLAMA
    assert mgr.determine_active_provider() == "OLLAMA"


@pytest.mark.asyncio
async def test_assistant_auto_fallback_on_429():
    mgr = LLMProviderManager()
    mgr.set_mode("AUTO")

    # Mock Gemini returning 429
    mgr.gemini.generate_response = AsyncMock(
        return_value=(False, "RESOURCE_EXHAUSTED: Quota exceeded for quota metric", 429)
    )

    # Mock Ollama returning successful response
    mgr.ollama.generate_response = AsyncMock(
        return_value=(True, "Local Ollama security response: sanitize inputs with prepared statements.", 200)
    )

    text, provider_used, success = await mgr.generate_assistant_response("How to fix SQL injection?")
    assert success is True
    assert "OLLAMA" in provider_used
    assert "sanitize inputs" in text

    # Verify Gemini is now in cooldown
    in_cooldown, _ = mgr.is_gemini_in_cooldown()
    assert in_cooldown is True


def test_strix_config_generation(tmp_path):
    mgr = LLMProviderManager()
    mgr.gemini.api_key = "test-gemini-key"
    
    # Test GEMINI provider config
    mgr.set_mode("GEMINI")
    cfg_path, provider, env = mgr.generate_strix_config(str(tmp_path))
    assert provider == "GEMINI"
    assert env["STRIX_LLM"].startswith("gemini/") or env["STRIX_LLM"].startswith("openai/")
    assert env["GEMINI_API_KEY"] == "test-gemini-key"
    assert env["LLM_API_KEY"] == "test-gemini-key"

    # Test OLLAMA provider config
    mgr.set_mode("OLLAMA")
    cfg_path_ol, provider_ol, env_ol = mgr.generate_strix_config(str(tmp_path))
    assert provider_ol == "OLLAMA"
    assert "ollama/" in env_ol["STRIX_LLM"]
    assert "LLM_API_BASE" in env_ol


def test_gemini_client_model_cleaning():
    from backend.integrations.llm.gemini_client import GeminiClient
    client = GeminiClient()
    # clean_model_name must not have 'openai/' or 'gemini/' prefixes
    assert not client.clean_model_name.startswith("openai/")
    assert not client.clean_model_name.startswith("gemini/")
    assert "gemini-3.6-flash" in client.clean_model_name
