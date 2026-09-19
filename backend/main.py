"""
FastAPI application entrypoint for the AI Security Testing Platform.

# FastAPI Lifespan — an async context manager that runs startup code (database migrations, scan discovery) and shutdown routines.
# CORS Middleware — security middleware allowing your React frontend to make cross-origin requests to this backend.
# Health Check Endpoint — a standard endpoint (/api/health) used by monitoring tools to verify the server is live.
# Static File Serving — in production (Render), FastAPI serves the built React frontend directly.
"""

import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

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
from backend.api.routes_projects import router as projects_router

# Resolve the path to the built frontend (relative to repo root)
FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup and shutdown orchestration.
    """
    logger.info("Starting AI Security Testing Platform...")
    if settings.RENDER:
        logger.info("Running on Render (ephemeral storage, no Ollama fallback).")

    # 1. Initialize database schema
    await init_db()

    # 2. Reconcile interrupted scans from previous container lifecycle (sleep / restart)
    try:
        from datetime import datetime
        from backend.database.connection import AsyncSessionLocal
        from backend.database.models import Scan
        from sqlalchemy import update
        async with AsyncSessionLocal() as session:
            stmt = (
                update(Scan)
                .where(Scan.status.in_(["In Progress", "Running"]))
                .values(
                    status="Failed",
                    exit_code=1,
                    end_time=datetime.utcnow(),
                )
            )
            res = await session.execute(stmt)
            if res.rowcount and res.rowcount > 0:
                await session.commit()
                logger.info(f"Reconciled {res.rowcount} interrupted scan(s) from previous container run.")
    except Exception as exc:
        logger.warning(f"Scan reconciliation note: {exc}")

    # 3. Auto-discover existing Strix runs (graceful on empty/missing dirs)
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

# Register API Routers (all under /api prefix)
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
app.include_router(projects_router)


@app.get("/api/health")
async def health_check():
    """
    Standard health check endpoint.
    Render pings this to verify the service is alive.
    """
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "engine": "Strix 1.6.2",
        "render": settings.RENDER,
    }


# ---------------------------------------------------------------------------
# Serve the React frontend in production
# ---------------------------------------------------------------------------
# When frontend/dist exists (built by build.sh on Render, or `npm run build`
# locally), mount it as static files and add a catch-all that serves
# index.html for client-side routing (React Router / SPA).
# During local dev with `npm run dev`, the Vite dev server handles this
# via its proxy, so this code path is unused.
# ---------------------------------------------------------------------------

if FRONTEND_DIST.is_dir() and (FRONTEND_DIST / "index.html").is_file():
    # Mount static assets (JS, CSS, images) at /assets
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="static-assets")

    @app.get("/{full_path:path}")
    async def serve_spa(request: Request, full_path: str):
        """
        Catch-all route: serve static files if they exist, otherwise
        return index.html for client-side routing.
        """
        # Try to serve an exact file match first (favicon.ico, etc.)
        file_path = FRONTEND_DIST / full_path
        if full_path and file_path.is_file():
            return FileResponse(str(file_path))
        # Fall back to index.html for SPA routing
        return FileResponse(str(FRONTEND_DIST / "index.html"))
