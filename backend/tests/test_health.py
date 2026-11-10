import pytest
from httpx import AsyncClient, ASGITransport
from backend.app.main import app

@pytest.mark.asyncio
async def test_health_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["app"] == "NEXUS — ReAct Intelligence"

@pytest.mark.asyncio
async def test_settings_status_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/settings/status")
        assert response.status_code == 200
        data = response.json()
        assert "available_models" in data
        assert "search_providers" in data
        assert len(data["available_models"]) >= 1
