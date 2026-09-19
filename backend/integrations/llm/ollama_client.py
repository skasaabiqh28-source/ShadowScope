"""
Ollama Client for local, offline security analysis and fallback.

# Local LLM Inference — running language models directly on your own computer without external API calls.
# Fallback Mechanism — automatically using a local model when the cloud provider becomes unavailable or quota-exhausted.
"""

from typing import Optional, Dict, Any, Tuple
import httpx

from backend.core.config import settings
from backend.core.logging import logger


class OllamaClient:
    """
    Communicates with a locally running Ollama instance (default: http://localhost:11434).
    Acts as a zero-cost, privacy-preserving fallback for security scanning and assistant Q&A.
    """

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None):
        self.base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        self.model = model or settings.OLLAMA_MODEL

    async def check_health(self) -> Tuple[bool, str]:
        """
        Pings Ollama's version or tags endpoint to check if the local server is running.
        """
        try:
            url = f"{self.base_url}/api/tags"
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(url)
                if resp.status_code == 200:
                    models = [m.get("name", "") for m in resp.json().get("models", [])]
                    models_str = ", ".join(models[:3]) if models else "No models loaded"
                    return True, f"Online ({models_str})"
                return False, f"HTTP {resp.status_code}"
        except Exception:
            return False, "Offline (Server not reachable at " + self.base_url + ")"

    async def generate_response(
        self, prompt: str, system_prompt: Optional[str] = None
    ) -> Tuple[bool, str, Optional[int]]:
        """
        Generates text using the local Ollama instance.
        """
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
        }

        url = f"{self.base_url}/api/chat"

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    content = data.get("message", {}).get("content", "")
                    return True, content, 200
                return False, f"Ollama HTTP {response.status_code}: {response.text}", response.status_code
        except httpx.ConnectError:
            return False, f"Could not connect to Ollama at {self.base_url}. Is Ollama started?", 503
        except httpx.TimeoutException:
            return False, "Ollama request timed out.", 504
        except Exception as exc:
            return False, f"Ollama error: {str(exc)}", 500
