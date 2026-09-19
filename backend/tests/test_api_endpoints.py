"""
Automated tests for FastAPI REST endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.database.connection import init_db


@pytest.fixture(scope="function")
async def client():
    await init_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


@pytest.mark.asyncio
async def test_api_health(client: AsyncClient):
    resp = await client.get("/api/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert "Strix" in data["engine"]


@pytest.mark.asyncio
async def test_dashboard_metrics(client: AsyncClient):
    resp = await client.get("/api/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "total_scans" in data
    assert "open_findings" in data
    assert "provider_status" in data


@pytest.mark.asyncio
async def test_provider_status_and_mode_update(client: AsyncClient):
    resp = await client.get("/api/provider/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "active_provider" in data

    # Switch mode to OLLAMA
    resp_update = await client.post(
        "/api/provider/mode",
        json={"mode": "OLLAMA", "ollama_model": "llama3.2"},
    )
    assert resp_update.status_code == 200
    assert resp_update.json()["mode"] == "OLLAMA"
    assert resp_update.json()["active_provider"] == "OLLAMA"

    # Switch mode back to AUTO
    resp_back = await client.post("/api/provider/mode", json={"mode": "AUTO"})
    assert resp_back.status_code == 200
    assert resp_back.json()["mode"] == "AUTO"


@pytest.mark.asyncio
async def test_scan_authorization_enforced(client: AsyncClient):
    resp = await client.post(
        "/api/scans",
        json={
            "target_type": "web_app",
            "target_value": "https://example.com",
            "scan_mode": "quick",
            "authorization_acknowledged": False,
        },
    )
    assert resp.status_code == 400
    assert "authorization acknowledgment is required" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_settings_endpoint_masks_secrets(client: AsyncClient):
    resp = await client.get("/api/settings")
    assert resp.status_code == 200
    data = resp.json()
    assert "app_name" in data
    assert "strix_version" in data
    assert "AQ." not in str(data)
    assert "sk-" not in str(data)
    assert data["gemini_api_key_status"] in ["Configured", "Not Configured"]
