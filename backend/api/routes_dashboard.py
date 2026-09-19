"""
API Routes for Dashboard Overview and Metrics Aggregation.

# Dashboard Aggregation — executing summary database queries (COUNT, GROUP BY) to present high-level security metrics in a single API call.
"""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.models import Scan, Finding, Project
from backend.schemas.api_schemas import (
    DashboardMetricsResponse,
    ScanResponse,
    FindingResponse,
    ProviderStatusResponse,
)
from backend.integrations.llm.provider_manager import provider_manager
from backend.api.routes_settings import check_docker_status
from backend.integrations.strix.strix_runner import resolve_strix_executable

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("", response_model=DashboardMetricsResponse)
async def get_dashboard_metrics(db: AsyncSession = Depends(get_db)):
    """
    Returns aggregated security overview metrics for the executive dashboard.
    """
    # 1. Total Scans Count
    total_scans_res = await db.execute(select(func.count(Scan.id)))
    total_scans = total_scans_res.scalar() or 0

    # 2. Active Scans (Starting or Running)
    active_scans_res = await db.execute(
        select(func.count(Scan.id)).where(Scan.status.in_(["Starting", "Running"]))
    )
    active_scans = active_scans_res.scalar() or 0

    # 3. Completed Scans
    completed_scans_res = await db.execute(
        select(func.count(Scan.id)).where(Scan.status == "Completed")
    )
    completed_scans = completed_scans_res.scalar() or 0

    # 4. Open Findings Count
    open_findings_res = await db.execute(
        select(func.count(Finding.id)).where(Finding.status.in_(["Open", "Confirmed", "Retest Required"]))
    )
    open_findings = open_findings_res.scalar() or 0

    # 5. Severity Counts
    async def get_sev_count(sev_name: str) -> int:
        r = await db.execute(
            select(func.count(Finding.id)).where(Finding.severity == sev_name)
        )
        return r.scalar() or 0

    crit_count = await get_sev_count("Critical")
    high_count = await get_sev_count("High")
    med_count = await get_sev_count("Medium")
    low_count = await get_sev_count("Low")
    info_count = await get_sev_count("Informational")

    # 6. Recent Scans (Top 5)
    scans_stmt = select(Scan).order_by(desc(Scan.start_time)).limit(5)
    recent_scans_raw = (await db.execute(scans_stmt)).scalars().all()
    recent_scans = []
    for s in recent_scans_raw:
        f_res = await db.execute(select(func.count(Finding.id)).where(Finding.scan_id == s.id))
        count = f_res.scalar() or 0
        recent_scans.append(
            ScanResponse(
                id=s.id,
                project_id=s.project_id,
                target_type=s.target_type,
                target_value=s.target_value,
                scan_mode=s.scan_mode,
                status=s.status,
                start_time=s.start_time,
                end_time=s.end_time,
                elapsed_seconds=s.elapsed_seconds,
                strix_run_name=s.strix_run_name,
                provider_used=s.provider_used,
                findings_count=count,
            )
        )

    # 7. Recent Findings (Top 6)
    findings_stmt = select(Finding).order_by(desc(Finding.created_at)).limit(6)
    recent_findings_raw = (await db.execute(findings_stmt)).scalars().all()
    recent_findings = [
        FindingResponse(
            id=f.id,
            scan_id=f.scan_id,
            project_id=f.project_id,
            title=f.title,
            severity=f.severity,
            category=f.category,
            description=f.description,
            location=f.location,
            endpoint=f.endpoint,
            status=f.status,
            created_at=f.created_at,
            updated_at=f.updated_at,
        )
        for f in recent_findings_raw
    ]

    # 8. Projects Count
    proj_count_res = await db.execute(select(func.count(Project.id)))
    projects_count = proj_count_res.scalar() or 0

    # 9. Provider Status
    prov_data = await provider_manager.get_provider_status()
    provider_status = ProviderStatusResponse(**prov_data)

    # 10. Infrastructure Check
    docker_running = check_docker_status()
    strix_avail = False
    try:
        resolve_strix_executable()
        strix_avail = True
    except Exception:
        pass

    return DashboardMetricsResponse(
        total_scans=total_scans,
        active_scans=active_scans,
        completed_scans=completed_scans,
        open_findings=open_findings,
        critical_findings=crit_count,
        high_findings=high_count,
        medium_findings=med_count,
        low_findings=low_count,
        info_findings=info_count,
        recent_scans=recent_scans,
        recent_findings=recent_findings,
        projects_count=projects_count,
        provider_status=provider_status,
        docker_running=docker_running,
        strix_available=strix_avail,
    )
