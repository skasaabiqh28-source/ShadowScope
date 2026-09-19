"""
Data models for Strix scan outputs and SARIF reports.

# SARIF (Static Analysis Results Interchange Format) — a standard JSON format used across the cybersecurity industry for exchanging vulnerability scanner results.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class StrixTargetInfo(BaseModel):
    type: Optional[str] = None
    original: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


class StrixLlmUsage(BaseModel):
    requests: Optional[int] = 0
    input_tokens: Optional[int] = 0
    output_tokens: Optional[int] = 0
    total_tokens: Optional[int] = 0


class StrixRunMetadata(BaseModel):
    run_id: str
    run_name: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    status: str = "running"
    auth_mode: Optional[str] = None
    targets_info: List[Dict[str, Any]] = []
    llm_usage: Optional[Dict[str, Any]] = None


class StrixFindingItem(BaseModel):
    title: str
    severity: str  # Critical, High, Medium, Low, Informational
    category: str = "General Security"
    description: str
    location: Optional[str] = None
    endpoint: Optional[str] = None
    evidence: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    raw_rule_id: Optional[str] = None
