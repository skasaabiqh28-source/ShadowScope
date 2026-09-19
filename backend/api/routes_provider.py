"""
API Routes for LLM Provider Management and Automatic Fallback Status.

# Failover Telemetry — real-time monitoring of provider availability, quota limits, and fallback events.
# Runtime Reconfiguration — modifying settings (such as switching to Ollama or resetting cooldown) without restarting the server.
"""

from fastapi import APIRouter
from backend.schemas.api_schemas import (
    ProviderStatusResponse,
    ProviderModeUpdate,
)
from backend.integrations.llm.provider_manager import provider_manager

router = APIRouter(prefix="/api/provider", tags=["LLM Provider"])


@router.get("/status", response_model=ProviderStatusResponse)
async def get_provider_status():
    """
    Returns current active provider, cooldown timers, and health diagnostics.
    """
    status_data = await provider_manager.get_provider_status()
    return ProviderStatusResponse(**status_data)


@router.post("/mode", response_model=ProviderStatusResponse)
async def update_provider_mode(payload: ProviderModeUpdate):
    """
    Updates provider mode (AUTO, GEMINI, OLLAMA) and optional endpoint configurations.
    """
    provider_manager.set_mode(
        mode=payload.mode,
        ollama_url=payload.ollama_url,
        ollama_model=payload.ollama_model,
    )
    if payload.gemini_model:
        provider_manager.gemini.model = payload.gemini_model

    status_data = await provider_manager.get_provider_status()
    return ProviderStatusResponse(**status_data)


@router.post("/reset-cooldown", response_model=ProviderStatusResponse)
async def reset_gemini_cooldown():
    """
    Manually clears Gemini cooldown timer to retry the primary provider immediately.
    """
    provider_manager.gemini_cooldown_until = 0.0
    status_data = await provider_manager.get_provider_status()
    return ProviderStatusResponse(**status_data)
