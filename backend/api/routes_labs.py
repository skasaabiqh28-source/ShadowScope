"""
API Routes for Security Training Labs.

# Training Sandbox — a safe, controlled environment designed for practicing security testing without endangering real systems.
# Intentionally Vulnerable Application — a sample application written with known security flaws for educational and testing purposes.
"""

from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.database.connection import get_db
from backend.database.models import Scan, Project
from backend.schemas.api_schemas import ScanResponse
from backend.integrations.strix.strix_adapter import strix_adapter

router = APIRouter(prefix="/api/labs", tags=["Training Labs"])

TRAINING_LABS = [
    {
        "id": "lab_owasp_juice_shop",
        "title": "OWASP Juice Shop (E-Commerce)",
        "category": "Web Application Security",
        "difficulty": "Beginner to Advanced",
        "description": "An intentionally insecure web application encompassing vulnerabilities from the entire OWASP Top 10 including SQL injection, XSS, and broken access controls.",
        "target_type": "web_app",
        "default_target": "http://localhost:3000",
        "recommended_mode": "quick",
        "instruction": "Focus on OWASP Top 10 vulnerabilities, specifically unauthenticated endpoints, SQL injection, and parameter tampering.",
        "authorization_notice": "Authorized educational target. Ensure your local Juice Shop instance is running.",
    },
    {
        "id": "lab_broken_api",
        "title": "Vulnerable REST API (BOLA / IDOR)",
        "category": "API Security",
        "difficulty": "Intermediate",
        "description": "Demonstrates Broken Object Level Authorization (BOLA) and Broken Function Level Authorization in modern microservices.",
        "target_type": "api_spec",
        "default_target": "http://localhost:8080/api/v1/openapi.json",
        "recommended_mode": "standard",
        "instruction": "Inspect user profile and order management endpoints for Missing Access Control and IDOR weaknesses.",
        "authorization_notice": "Authorized training lab environment.",
    },
    {
        "id": "lab_local_signbridge_sample",
        "title": "SignBridgeAI Local Whitebox Security Review",
        "category": "Source Code & Model Security",
        "difficulty": "Advanced",
        "description": "Whitebox security audit of the local SignBridgeAI repository covering API endpoints, input landmark bounds checking, and dependency health.",
        "target_type": "local_project",
        "default_target": "C:\\Users\\saabi\\OneDrive\\Desktop\\SignBridgeAI",
        "recommended_mode": "quick",
        "instruction": "Perform whitebox analysis of FastAPI endpoints, routes.py, and request parsing.",
        "authorization_notice": "Authorized local workspace audit.",
    },
]


@router.get("")
async def list_training_labs():
    """
    Returns curated training labs for learning application security safely.
    """
    return TRAINING_LABS


class LaunchLabRequest(BaseModel):
    custom_target: str = None
    scan_mode: str = "quick"


@router.post("/{lab_id}/launch", response_model=ScanResponse)
async def launch_lab_scan(
    lab_id: str,
    payload: LaunchLabRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Launches an authorized security assessment against a selected training lab.
    """
    lab = next((l for l in TRAINING_LABS if l["id"] == lab_id), None)
    if not lab:
        raise HTTPException(status_code=404, detail="Training lab not found")

    target = payload.custom_target or lab["default_target"]
    mode = payload.scan_mode or lab["recommended_mode"]

    # Create Scan row
    scan = Scan(
        target_type=lab["target_type"],
        target_value=target,
        scan_mode=mode,
        instruction=f"[TRAINING LAB: {lab['title']}] {lab['instruction']}",
        status="Starting",
        start_time=datetime.utcnow(),
    )
    db.add(scan)
    await db.commit()
    await db.refresh(scan)

    # Launch background Strix task
    await strix_adapter.start_scan_job(
        scan_id=scan.id,
        target=target,
        scan_mode=mode,
        instruction=scan.instruction,
    )

    return ScanResponse(
        id=scan.id,
        target_type=scan.target_type,
        target_value=scan.target_value,
        scan_mode=scan.scan_mode,
        instruction=scan.instruction,
        status=scan.status,
        start_time=scan.start_time,
        provider_used=scan.provider_used,
    )
