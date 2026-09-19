"""
FastAPI application entrypoint for the AI Security Testing Platform.

# FastAPI Lifespan — an async context manager that runs startup code (database migrations, scan discovery) and shutdown routines.
# CORS Middleware — security middleware allowing your React frontend to make cross-origin requests to this backend.
# Health Check Endpoint — a standard endpoint (/api/health) used by monitoring tools to verify the server is live.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.core.config import settings
from backend.core.logging import logger
from backend.database.connection import init_db
from backend.integrations.strix.strix_adapter import strix_adapter

# Import all API route modules
from backend.api.routes_dashboard import router as dashboard_router
from backend.api.routes_scans import router as scans_router
from backend.api.routes_findings import router as findings_router
from backend.api.routes_attack_paths import router as attack_paths_router
from backend.api.routes_api_security import router as api_security_router
from backend.api.routes_reports import router as reports_router
from backend.api.routes_assistant import router as assistant_router
from backend.api.routes_labs import router as labs_router
from backend.api.routes_provider import router as provider_router
from backend.api.routes_settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown orchestration.
    """
    logger.info("Starting AI Security Testing Platform...")
    # 1. Initialize database schema
    await init_db()
    
    # 2. Auto-discover existing Strix runs (e.g. SignBridgeAI scan)
    try:
        count = await strix_adapter.discover_and_import_existing_runs()
        if count > 0:
            logger.info(f"Auto-discovered and imported {count} existing Strix scan run(s).")
    except Exception as exc:
        logger.warning(f"Scan discovery note: {exc}")

    yield

    logger.info("Shutting down AI Security Testing Platform.")


# Create the FastAPI instance
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Production-grade AI-assisted security testing orchestrator built around the Strix engine.",
    lifespan=lifespan,
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(dashboard_router)
app.include_router(scans_router)
app.include_router(findings_router)
app.include_router(attack_paths_router)
app.include_router(api_security_router)
app.include_router(reports_router)
app.include_router(assistant_router)
app.include_router(labs_router)
app.include_router(provider_router)
app.include_router(settings_router)


@app.get("/api/health")
async def health_check():
    """
    Standard health check endpoint.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "engine": "Strix 1.6.2",
    }
