"""
API Routes for the AI Security Assistant.

# Grounding / RAG (Retrieval-Augmented Generation) — feeding real database records (findings, scan logs) into the AI prompt so it never hallucinates vulnerabilities.
# System Prompt — instructions guiding the AI model's role, tone, and boundaries.
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database.connection import get_db
from backend.database.models import Finding, Scan, Project
from backend.schemas.api_schemas import (
    AssistantChatRequest,
    AssistantChatResponse,
)
from backend.integrations.llm.provider_manager import provider_manager

router = APIRouter(prefix="/api/assistant", tags=["Security Assistant"])

ASSISTANT_SYSTEM_PROMPT = """You are the AI Security Assistant built into the AI Security Testing Platform.
Your duty is to assist developers and security engineers in understanding real vulnerabilities detected by the Strix penetration testing engine.

Strict Rules:
1. ONLY discuss facts present in the provided scan context or well-established application security knowledge (OWASP, CWE).
2. NEVER hallucinate or invent vulnerabilities that are not supported by the scan data.
3. If the provided context does not contain sufficient details to answer a question, explicitly state:
   "The scan data does not provide enough information to determine this."
4. Provide concise, clear, and actionable remediation instructions with secure code snippets where applicable.
5. Keep explanations beginner-friendly and professional.
"""


@router.post("/chat", response_model=AssistantChatResponse)
async def chat_with_security_assistant(
    payload: AssistantChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Interacts with the AI Security Assistant, grounding answers in real scan findings.
    Automatically leverages the active provider (Gemini or Ollama fallback).
    """
    context_sections = []

    # 1. If a specific finding is referenced, fetch and inject it
    if payload.finding_id:
        f_res = await db.execute(select(Finding).where(Finding.id == payload.finding_id))
        finding = f_res.scalar_one_or_none()
        if finding:
            context_sections.append(
                f"Referenced Finding:\n"
                f"- Title: {finding.title}\n"
                f"- Severity: {finding.severity}\n"
                f"- Category: {finding.category}\n"
                f"- Location: {finding.location or 'N/A'}\n"
                f"- Endpoint: {finding.endpoint or 'N/A'}\n"
                f"- Description: {finding.description}\n"
                f"- Evidence: {finding.evidence or 'None'}\n"
                f"- Impact: {finding.impact or 'N/A'}\n"
                f"- Existing Recommendation: {finding.recommendation or 'N/A'}\n"
            )

    # 2. If a scan is referenced, fetch scan context
    if payload.scan_id:
        s_res = await db.execute(select(Scan).where(Scan.id == payload.scan_id))
        scan = s_res.scalar_one_or_none()
        if scan:
            context_sections.append(
                f"Referenced Scan:\n"
                f"- Target: {scan.target_value} ({scan.target_type})\n"
                f"- Mode: {scan.scan_mode}\n"
                f"- Status: {scan.status}\n"
            )

    context_str = "\n".join(context_sections)
    full_prompt = (
        f"Context from scan database:\n{context_str}\n\n"
        f"User Inquiry:\n{payload.query}"
        if context_sections
        else payload.query
    )

    # Generate response via Provider Manager (Gemini -> Ollama automatic fallback)
    response_text, provider_used, success = await provider_manager.generate_assistant_response(
        prompt=full_prompt,
        system_prompt=ASSISTANT_SYSTEM_PROMPT,
    )

    return AssistantChatResponse(
        answer=response_text,
        provider_used=provider_used,
        grounded_in_data=bool(context_sections),
        disclaimer=(
            None
            if success
            else "Notice: Service experienced provider failover or network limits."
        ),
    )
