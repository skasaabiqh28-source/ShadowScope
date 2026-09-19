"""
API Routes for Project Management.

# Project Entity — represents an authorized application, repository, or system under security assessment.
# Multi-Target Scope — allows grouping multiple recurring scans and historical findings under a single project umbrella.
# SQLAlchemy Async Query — querying the database asynchronously without blocking the event loop.
"""

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, desc, func
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.models import Project, Scan, Finding
from backend.schemas.api_schemas import (
    ProjectBase,
    ProjectResponse,
)
from backend.core.security import validate_local_path, validate_web_url, validate_github_repo

router = APIRouter(prefix="/api/projects", tags=["Projects"])


@router.get("", response_model=List[ProjectResponse])
async def list_projects(db: AsyncSession = Depends(get_db)):
    """
    Returns all registered target projects with scan and finding counts.
    """
    stmt = select(Project).order_by(desc(Project.created_at))
    res = await db.execute(stmt)
    projects = res.scalars().all()

    result = []
    for p in projects:
        # Count associated scans
        scans_count_res = await db.execute(
            select(func.count(Scan.id)).where(Scan.project_id == p.id)
        )
        scans_count = scans_count_res.scalar() or 0

        # Count associated findings
        findings_count_res = await db.execute(
            select(func.count(Finding.id)).where(Finding.project_id == p.id)
        )
        findings_count = findings_count_res.scalar() or 0

        result.append(
            ProjectResponse(
                id=p.id,
                name=p.name,
                description=p.description,
                target_type=p.target_type,
                target_value=p.target_value,
                created_at=p.created_at,
                updated_at=p.updated_at,
                scans_count=scans_count,
                findings_count=findings_count,
            )
        )
    return result


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """
    Fetches details for a specific project.
    """
    stmt = select(Project).where(Project.id == project_id)
    res = await db.execute(stmt)
    project = res.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    scans_count_res = await db.execute(
        select(func.count(Scan.id)).where(Scan.project_id == project.id)
    )
    scans_count = scans_count_res.scalar() or 0

    findings_count_res = await db.execute(
        select(func.count(Finding.id)).where(Finding.project_id == project.id)
    )
    findings_count = findings_count_res.scalar() or 0

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        target_type=project.target_type,
        target_value=project.target_value,
        created_at=project.created_at,
        updated_at=project.updated_at,
        scans_count=scans_count,
        findings_count=findings_count,
    )


@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(payload: ProjectBase, db: AsyncSession = Depends(get_db)):
    """
    Creates a new target project with validated target path or URL.
    """
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

    project = Project(
        name=payload.name,
        description=payload.description,
        target_type=payload.target_type,
        target_value=valid_target,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        target_type=project.target_type,
        target_value=project.target_value,
        created_at=project.created_at,
        updated_at=project.updated_at,
        scans_count=0,
        findings_count=0,
    )
