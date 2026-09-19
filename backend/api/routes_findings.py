"""
API Routes for Vulnerability Findings, Status Updates, Notes, and Retest requests.

# CRUD (Create, Read, Update, Delete) — the four basic data operations in REST APIs.
# PATCH Request — an HTTP method used to apply partial modifications to an existing resource.
# Audit Trail — a chronological record tracking status changes, notes, and retest outcomes.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.models import Finding, FindingNote, RetestHistory, Scan, utc_now
from backend.schemas.api_schemas import (
    FindingResponse,
    FindingStatusUpdate,
    FindingNoteCreate,
    FindingNoteSchema,
    RetestRequest,
)
from backend.integrations.strix.strix_adapter import strix_adapter

router = APIRouter(prefix="/api/findings", tags=["Findings"])


@router.get("", response_model=List[FindingResponse])
async def list_findings(
    scan_id: Optional[str] = None,
    project_id: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    """
    Lists vulnerability findings with multi-field filtering and search.
    """
    stmt = (
        select(Finding)
        .options(selectinload(Finding.scan), selectinload(Finding.notes), selectinload(Finding.retests))
        .order_by(desc(Finding.created_at))
    )

    if scan_id:
        stmt = stmt.where(Finding.scan_id == scan_id)
    if project_id:
        stmt = stmt.where(Finding.project_id == project_id)
    if severity:
        stmt = stmt.where(Finding.severity == severity)
    if status_filter:
        stmt = stmt.where(Finding.status == status_filter)
    if category:
        stmt = stmt.where(Finding.category == category)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            (Finding.title.ilike(pattern))
            | (Finding.description.ilike(pattern))
            | (Finding.location.ilike(pattern))
        )

    res = await db.execute(stmt)
    findings = res.scalars().all()
    return findings


@router.get("/{finding_id}", response_model=FindingResponse)
async def get_finding(finding_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches comprehensive details for a single finding, including notes and retest audit logs.
    """
    stmt = (
        select(Finding)
        .options(selectinload(Finding.scan), selectinload(Finding.notes), selectinload(Finding.retests))
        .where(Finding.id == finding_id)
    )
    res = await db.execute(stmt)
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


@router.patch("/{finding_id}", response_model=FindingResponse)
async def update_finding_status(
    finding_id: str,
    payload: FindingStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Updates finding status (e.g. Mark Fixed, Confirmed, Accepted Risk) and adds an audit note.
    """
    stmt = (
        select(Finding)
        .options(selectinload(Finding.scan), selectinload(Finding.notes), selectinload(Finding.retests))
        .where(Finding.id == finding_id)
    )
    res = await db.execute(stmt)
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    old_status = finding.status
    finding.status = payload.status
    finding.updated_at = utc_now()

    # If an explanation note was provided, save it
    if payload.note:
        note = FindingNote(
            finding_id=finding.id,
            author="Security Analyst",
            content=f"Status changed from [{old_status}] to [{payload.status}]: {payload.note}",
            created_at=utc_now(),
        )
        db.add(note)

    await db.commit()
    await db.refresh(finding)
    return finding


@router.post("/{finding_id}/notes", response_model=FindingNoteSchema)
async def add_finding_note(
    finding_id: str,
    payload: FindingNoteCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Appends an analyst note to a finding.
    """
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    note = FindingNote(
        finding_id=finding.id,
        author=payload.author or "Security Analyst",
        content=payload.content,
        created_at=utc_now(),
    )
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@router.post("/{finding_id}/retest")
async def trigger_finding_retest(
    finding_id: str,
    payload: RetestRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates an authorized Strix retest scan focused specifically on verifying this finding.
    """
    res = await db.execute(select(Finding).where(Finding.id == finding_id))
    finding = res.scalar_one_or_none()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")

    s_res = await db.execute(select(Scan).where(Scan.id == finding.scan_id))
    original_scan = s_res.scalar_one_or_none()
    if not original_scan:
        raise HTTPException(status_code=404, detail="Original scan not found")

    # Construct targeted instruction for Strix retest
    focused_instruction = (
        f"Retest Verification for '{finding.title}' located at '{finding.location or original_scan.target_value}'. "
        f"Specific objective: {payload.instruction}"
    )

    retest_scan = Scan(
        project_id=original_scan.project_id,
        target_type=original_scan.target_type,
        target_value=original_scan.target_value,
        scan_mode=payload.scan_mode or "quick",
        instruction=focused_instruction,
        status="Starting",
        start_time=utc_now(),
    )
    db.add(retest_scan)
    await db.commit()
    await db.refresh(retest_scan)

    # Record Retest History entry
    retest_log = RetestHistory(
        finding_id=finding.id,
        original_scan_id=original_scan.id,
        retest_scan_id=retest_scan.id,
        previous_status=finding.status,
        new_status="Retest Required",
        result="Retest Initiated",
        notes=payload.instruction,
    )
    finding.status = "Retest Required"
    db.add(retest_log)
    await db.commit()

    # Launch background job
    await strix_adapter.start_scan_job(
        scan_id=retest_scan.id,
        target=original_scan.target_value,
        scan_mode=retest_scan.scan_mode,
        instruction=focused_instruction,
    )

    return {
        "message": "Retest scan initiated successfully.",
        "retest_scan_id": retest_scan.id,
        "finding_id": finding.id,
    }
