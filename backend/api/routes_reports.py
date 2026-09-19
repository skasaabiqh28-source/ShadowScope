"""
API Routes for Security Report Generation and Downloads.

# FileResponse — a FastAPI response type that streams local files (like PDFs or HTML reports) directly to the browser for download.
"""

import os
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.core.config import settings
from backend.database.connection import get_db
from backend.database.models import Report, Scan, Finding, Project, RetestHistory
from backend.schemas.api_schemas import (
    ReportGenerateRequest,
    ReportResponse,
)
from backend.reports.generator import (
    generate_html_report,
    generate_json_report,
    generate_pdf_report,
)

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("", response_model=List[ReportResponse])
async def list_reports(scan_id: str = None, db: AsyncSession = Depends(get_db)):
    """
    Lists generated security reports.
    """
    stmt = select(Report).order_by(desc(Report.generated_at))
    if scan_id:
        stmt = stmt.where(Report.scan_id == scan_id)

    res = await db.execute(stmt)
    reports = res.scalars().all()

    return [
        ReportResponse(
            id=r.id,
            scan_id=r.scan_id,
            title=r.title,
            format=r.report_format,
            file_path=r.file_path,
            download_url=f"/api/reports/download/{os.path.basename(r.file_path)}",
            generated_at=r.generated_at,
        )
        for r in reports
    ]


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches details and download link for a specific report.
    """
    res = await db.execute(select(Report).where(Report.id == report_id))
    r = res.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportResponse(
        id=r.id,
        scan_id=r.scan_id,
        title=r.title,
        format=r.report_format,
        file_path=r.file_path,
        download_url=f"/api/reports/download/{os.path.basename(r.file_path)}",
        generated_at=r.generated_at,
    )



@router.post("", response_model=ReportResponse)
async def create_report(payload: ReportGenerateRequest, db: AsyncSession = Depends(get_db)):
    """
    Generates a security audit report in HTML, PDF, or JSON format.
    """
    s_res = await db.execute(select(Scan).where(Scan.id == payload.scan_id))
    scan = s_res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    p_res = await db.execute(select(Project).where(Project.id == scan.project_id))
    project = p_res.scalar_one_or_none()

    f_res = await db.execute(select(Finding).where(Finding.scan_id == scan.id))
    findings = f_res.scalars().all()

    finding_ids = [f.id for f in findings]
    retests = []
    if finding_ids:
        r_res = await db.execute(
            select(RetestHistory).where(RetestHistory.finding_id.in_(finding_ids))
        )
        retests = r_res.scalars().all()

    fmt = payload.format.lower()
    title = payload.title or f"Security Assessment Report - {project.name if project else scan.target_value}"

    if fmt == "pdf":
        file_path = generate_pdf_report(scan, project, findings, retests)
    elif fmt == "json":
        file_path = generate_json_report(scan, project, findings, retests)
    else:
        fmt = "html"
        file_path = generate_html_report(scan, project, findings, retests)

    report_row = Report(
        scan_id=scan.id,
        title=title,
        report_format=fmt,
        file_path=file_path,
        generated_at=datetime.utcnow(),
    )
    db.add(report_row)
    await db.commit()
    await db.refresh(report_row)

    return ReportResponse(
        id=report_row.id,
        scan_id=report_row.scan_id,
        title=report_row.title,
        format=report_row.report_format,
        file_path=report_row.file_path,
        download_url=f"/api/reports/download/{os.path.basename(report_row.file_path)}",
        generated_at=report_row.generated_at,
    )


@router.get("/download/{filename}")
async def download_report_file(filename: str):
    """
    Streams the requested report file directly to the client.
    """
    # Prevent path traversal on filename
    safe_name = os.path.basename(filename)
    full_path = os.path.join(settings.REPORTS_DIR, safe_name)

    if not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Report file not found.")

    media_type = "application/octet-stream"
    if safe_name.endswith(".pdf"):
        media_type = "application/pdf"
    elif safe_name.endswith(".html"):
        media_type = "text/html"
    elif safe_name.endswith(".json"):
        media_type = "application/json"

    return FileResponse(full_path, media_type=media_type, filename=safe_name)
