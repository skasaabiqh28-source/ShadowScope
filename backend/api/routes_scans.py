"""
API Routes for Scans, Scan Logs, and Retests.

# APIRouter — a FastAPI component that groups related API endpoints into modular route collections.
# Path Parameter — variables embedded directly into the URL (e.g. /scans/{id}).
# HTTP Status Codes — standard response codes (200 OK, 201 Created, 404 Not Found, 400 Bad Request).
"""

from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.models import Scan, Finding, ScanLog, Project, RetestHistory
from backend.schemas.api_schemas import (
    ScanCreate,
    ScanResponse,
    ScanLogEntry,
    RetestRequest,
)
from backend.core.security import validate_local_path, validate_web_url, validate_github_repo
from backend.integrations.llm.provider_manager import provider_manager
from backend.integrations.strix.strix_adapter import strix_adapter
from backend.integrations.strix.strix_runner import cancel_active_scan

router = APIRouter(prefix="/api/scans", tags=["Scans"])


@router.get("", response_model=List[ScanResponse])
async def list_scans(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Retrieves all scans, optionally filtered by project or status.
    """
    stmt = select(Scan).order_by(desc(Scan.start_time))
    if project_id:
        stmt = stmt.where(Scan.project_id == project_id)
    if status_filter:
        stmt = stmt.where(Scan.status == status_filter)

    result = await db.execute(stmt)
    scans = result.scalars().all()

    # Enrich scans with findings count
    response_list = []
    for s in scans:
        f_res = await db.execute(select(Finding).where(Finding.scan_id == s.id))
        findings = f_res.scalars().all()
        
        resp = ScanResponse(
            id=s.id,
            project_id=s.project_id,
            target_type=s.target_type,
            target_value=s.target_value,
            scan_mode=s.scan_mode,
            instruction=s.instruction,
            max_budget=s.max_budget,
            max_turns=s.max_turns,
            status=s.status,
            start_time=s.start_time,
            end_time=s.end_time,
            elapsed_seconds=s.elapsed_seconds,
            strix_run_name=s.strix_run_name,
            provider_used=s.provider_used,
            exit_code=s.exit_code,
            findings_count=len(findings),
            critical_count=sum(1 for f in findings if f.severity == "Critical"),
            high_count=sum(1 for f in findings if f.severity == "High"),
            medium_count=sum(1 for f in findings if f.severity == "Medium"),
            low_count=sum(1 for f in findings if f.severity == "Low"),
            info_count=sum(1 for f in findings if f.severity == "Informational"),
        )
        response_list.append(resp)

    return response_list


@router.post("", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def create_scan(payload: ScanCreate, db: AsyncSession = Depends(get_db)):
    """
    Validates the target, requires user authorization acknowledgment,
    creates the Scan entry, and starts Strix asynchronously.
    """
    if not payload.authorization_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Explicit authorization acknowledgment is required before initiating a scan.",
        )

    # Validate target by type
    valid_target = payload.target_value.strip()
    if payload.target_type == "local_project":
        is_valid, err_msg, _ = validate_local_path(valid_target)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
        valid_target = err_msg
    elif payload.target_type == "web_app":
        is_valid, err_msg = validate_web_url(valid_target)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)
    elif payload.target_type == "github_repo":
        is_valid, err_msg = validate_github_repo(valid_target)
        if not is_valid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=err_msg)

    # Resolve or create Project
    project_id = payload.project_id
    if not project_id and payload.project_name:
        p_res = await db.execute(select(Project).where(Project.name == payload.project_name))
        existing_p = p_res.scalar_one_or_none()
        if existing_p:
            project_id = existing_p.id
        else:
            new_p = Project(
                name=payload.project_name,
                target_type=payload.target_type,
                target_value=valid_target,
            )
            db.add(new_p)
            await db.flush()
            project_id = new_p.id

    active_provider = provider_manager.determine_active_provider()
    scan = Scan(
        project_id=project_id,
        target_type=payload.target_type,
        target_value=valid_target,
        scan_mode=payload.scan_mode,
        instruction=payload.instruction,
        max_budget=payload.max_budget,
        max_turns=payload.max_turns,
        status="Starting",
        start_time=datetime.utcnow(),
        provider_used=active_provider,
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Launch Strix background job
    await strix_adapter.start_scan_job(
        scan_id=scan.id,
        target=valid_target,
        scan_mode=payload.scan_mode,
        instruction=payload.instruction,
        max_budget=payload.max_budget,
        max_turns=payload.max_turns,
    )

    return ScanResponse(
        id=scan.id,
        project_id=scan.project_id,
        target_type=scan.target_type,
        target_value=scan.target_value,
        scan_mode=scan.scan_mode,
        instruction=scan.instruction,
        max_budget=scan.max_budget,
        max_turns=scan.max_turns,
        status=scan.status,
        start_time=scan.start_time,
        end_time=scan.end_time,
        elapsed_seconds=scan.elapsed_seconds,
        strix_run_name=scan.strix_run_name,
        provider_used=scan.provider_used,
    )


@router.get("/{scan_id}", response_model=ScanResponse)
async def get_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches details and findings metrics for a specific scan.
    """
    res = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    f_res = await db.execute(select(Finding).where(Finding.scan_id == scan.id))
    findings = f_res.scalars().all()

    # Calculate real elapsed time if running
    elapsed = scan.elapsed_seconds
    if scan.status in ["Starting", "Running"] and scan.start_time:
        elapsed = int((datetime.utcnow() - scan.start_time).total_seconds())

    return ScanResponse(
        id=scan.id,
        project_id=scan.project_id,
        target_type=scan.target_type,
        target_value=scan.target_value,
        scan_mode=scan.scan_mode,
        instruction=scan.instruction,
        max_budget=scan.max_budget,
        max_turns=scan.max_turns,
        status=scan.status,
        start_time=scan.start_time,
        end_time=scan.end_time,
        elapsed_seconds=elapsed,
        strix_run_name=scan.strix_run_name,
        provider_used=scan.provider_used,
        exit_code=scan.exit_code,
        findings_count=len(findings),
        critical_count=sum(1 for f in findings if f.severity == "Critical"),
        high_count=sum(1 for f in findings if f.severity == "High"),
        medium_count=sum(1 for f in findings if f.severity == "Medium"),
        low_count=sum(1 for f in findings if f.severity == "Low"),
        info_count=sum(1 for f in findings if f.severity == "Informational"),
    )


@router.post("/{scan_id}/cancel")
async def cancel_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """
    Cancels an active running scan.
    """
    res = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    stopped = cancel_active_scan(scan_id)
    scan.status = "Cancelled"
    scan.end_time = datetime.utcnow()
    await db.commit()

    return {"message": "Scan cancellation requested.", "cancelled": stopped}


@router.get("/{scan_id}/logs", response_model=List[ScanLogEntry])
async def get_scan_logs(scan_id: str, limit: int = 500, db: AsyncSession = Depends(get_db)):
    """
    Returns recorded stdout/stderr log stream entries for this scan.
    """
    stmt = (
        select(ScanLog)
        .where(ScanLog.scan_id == scan_id)
        .order_by(ScanLog.id.asc())
        .limit(limit)
    )
    res = await db.execute(stmt)
    logs = res.scalars().all()
    return logs


@router.get("/compare/{scan1_id}/{scan2_id}")
async def compare_scans(scan1_id: str, scan2_id: str, db: AsyncSession = Depends(get_db)):
    """
    Compares two scans and determines:
    - New findings in Scan 2
    - Resolved findings (present in Scan 1, absent in Scan 2)
    - Persistent findings (present in both)
    - Severity changes
    """
    s1_res = await db.execute(select(Scan).where(Scan.id == scan1_id))
    scan1 = s1_res.scalar_one_or_none()
    s2_res = await db.execute(select(Scan).where(Scan.id == scan2_id))
    scan2 = s2_res.scalar_one_or_none()

    if not scan1 or not scan2:
        raise HTTPException(status_code=404, detail="One or both scans were not found.")

    f1_res = await db.execute(select(Finding).where(Finding.scan_id == scan1_id))
    f1_list = f1_res.scalars().all()
    f2_res = await db.execute(select(Finding).where(Finding.scan_id == scan2_id))
    f2_list = f2_res.scalars().all()

    # Map by title and location
    f1_map = {f"{f.title}::{f.location}": f for f in f1_list}
    f2_map = {f"{f.title}::{f.location}": f for f in f2_list}

    resolved = []
    for key, f in f1_map.items():
        if key not in f2_map:
            resolved.append(f)

    new_findings = []
    persistent = []
    severity_changed = []

    for key, f in f2_map.items():
        if key not in f1_map:
            new_findings.append(f)
        else:
            old_f = f1_map[key]
            if old_f.severity != f.severity:
                severity_changed.append({
                    "finding": f,
                    "previous_severity": old_f.severity,
                    "current_severity": f.severity,
                })
            else:
                persistent.append(f)

    return {
        "scan1": {"id": scan1.id, "target": scan1.target_value, "date": scan1.start_time},
        "scan2": {"id": scan2.id, "target": scan2.target_value, "date": scan2.start_time},
        "metrics": {
            "resolved_count": len(resolved),
            "new_count": len(new_findings),
            "persistent_count": len(persistent),
            "severity_changed_count": len(severity_changed),
        },
        "resolved": resolved,
        "new": new_findings,
        "persistent": persistent,
        "severity_changed": severity_changed,
    }


@router.delete("/{scan_id}", status_code=status.HTTP_200_OK)
async def delete_scan(scan_id: str, db: AsyncSession = Depends(get_db)):
    """
    Deletes a scan and cascades removal of its logs, findings, and attack paths.
    """
    res = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # If the scan is currently running, cancel the subprocess first
    if scan.status in ["Starting", "Running"]:
        cancel_active_scan(scan_id)

    await db.delete(scan)
    await db.commit()
    return {"message": f"Scan {scan_id} deleted successfully.", "scan_id": scan_id}


@router.post("/{scan_id}/retest", response_model=ScanResponse, status_code=status.HTTP_201_CREATED)
async def retest_scan(
    scan_id: str,
    payload: Optional[RetestRequest] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates a full retest of an entire previous scan, optionally using Strix's --resume or focused instruction.
    """
    res = await db.execute(select(Scan).where(Scan.id == scan_id))
    original_scan = res.scalar_one_or_none()
    if not original_scan:
        raise HTTPException(status_code=404, detail="Original scan not found")

    instruction = (
        payload.instruction
        if (payload and payload.instruction)
        else f"Retest verification of entire security surface for {original_scan.target_value}"
    )
    scan_mode = payload.scan_mode if (payload and payload.scan_mode) else original_scan.scan_mode

    retest_scan = Scan(
        project_id=original_scan.project_id,
        target_type=original_scan.target_type,
        target_value=original_scan.target_value,
        scan_mode=scan_mode,
        instruction=instruction,
        max_budget=original_scan.max_budget,
        max_turns=original_scan.max_turns,
        status="Starting",
        start_time=datetime.now(timezone.utc),
    )
    db.add(retest_scan)
    await db.commit()
    await db.refresh(retest_scan)

    # Launch background job with resume_run_name if available
    await strix_adapter.start_scan_job(
        scan_id=retest_scan.id,
        target=original_scan.target_value,
        scan_mode=scan_mode,
        instruction=instruction,
        max_budget=retest_scan.max_budget,
        max_turns=retest_scan.max_turns,
        resume_run_name=original_scan.strix_run_name,
    )

    return ScanResponse(
        id=retest_scan.id,
        project_id=retest_scan.project_id,
        target_type=retest_scan.target_type,
        target_value=retest_scan.target_value,
        scan_mode=retest_scan.scan_mode,
        instruction=retest_scan.instruction,
        max_budget=retest_scan.max_budget,
        max_turns=retest_scan.max_turns,
        status=retest_scan.status,
        start_time=retest_scan.start_time,
        provider_used=retest_scan.provider_used,
        findings_count=0,
    )

