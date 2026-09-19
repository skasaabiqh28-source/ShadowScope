"""
Pydantic data schemas for API request validation and response serialization.

# Pydantic — a Python library that validates the shape and types of incoming data and automatically serializes responses to JSON.
# Serialization — transforming Python database models into structured JSON format for the frontend.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl, ConfigDict


# ---------------------------------------------------------------------------
# Project Schemas
# ---------------------------------------------------------------------------
class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    target_type: str = Field(..., description="local_project, github_repo, web_app, api_spec")
    target_value: str = Field(..., min_length=1, max_length=1024)


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: str
    created_at: datetime
    updated_at: datetime
    scan_count: int = 0
    finding_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Scan Schemas
# ---------------------------------------------------------------------------
class ScanCreate(BaseModel):
    project_id: Optional[str] = None
    project_name: Optional[str] = None
    target_type: str = Field(..., description="local_project, github_repo, web_app, api_spec")
    target_value: str = Field(..., min_length=1, max_length=1024)
    scan_mode: str = Field("deep", description="quick, standard, deep")
    instruction: Optional[str] = Field(None, description="Custom testing instructions or focus areas")
    max_budget: Optional[float] = Field(None, ge=0.0, description="Max USD budget for LLM calls")
    max_turns: Optional[int] = Field(None, ge=1, le=1000, description="Max agent turns")
    authorization_acknowledged: bool = Field(
        ...,
        description="Explicit user acknowledgment that they own or are authorized to test this target"
    )


class ScanResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    target_type: str
    target_value: str
    scan_mode: str
    instruction: Optional[str] = None
    max_budget: Optional[float] = None
    max_turns: Optional[int] = None
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    elapsed_seconds: int = 0
    strix_run_name: Optional[str] = None
    provider_used: str = "GEMINI"
    exit_code: Optional[int] = None
    findings_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    medium_count: int = 0
    low_count: int = 0
    info_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class ScanLogEntry(BaseModel):
    id: int
    scan_id: str
    timestamp: datetime
    level: str
    message: str
    source: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Finding Schemas
# ---------------------------------------------------------------------------
class FindingNoteSchema(BaseModel):
    id: str
    author: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RetestHistorySchema(BaseModel):
    id: str
    original_scan_id: str
    retest_scan_id: Optional[str] = None
    previous_status: str
    new_status: str
    result: str
    notes: Optional[str] = None
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class FindingResponse(BaseModel):
    id: str
    scan_id: str
    project_id: Optional[str] = None
    target: Optional[str] = None
    title: str
    severity: str  # Critical, High, Medium, Low, Informational
    category: str
    description: str
    location: Optional[str] = None
    endpoint: Optional[str] = None
    evidence: Optional[str] = None
    impact: Optional[str] = None
    recommendation: Optional[str] = None
    status: str  # Open, Confirmed, Fixed, Accepted Risk, Retest Required
    created_at: datetime
    updated_at: datetime
    notes: List[FindingNoteSchema] = []
    retests: List[RetestHistorySchema] = []

    model_config = ConfigDict(from_attributes=True)


class FindingStatusUpdate(BaseModel):
    status: str = Field(..., description="Open, Confirmed, Fixed, Accepted Risk, Retest Required")
    note: Optional[str] = None


class FindingNoteCreate(BaseModel):
    content: str = Field(..., min_length=1)
    author: Optional[str] = "Security Analyst"


# ---------------------------------------------------------------------------
# Retest Request Schema
# ---------------------------------------------------------------------------
class RetestRequest(BaseModel):
    instruction: Optional[str] = "Verify if previous finding has been successfully fixed."
    scan_mode: Optional[str] = "quick"


# ---------------------------------------------------------------------------
# Attack Path Schemas
# ---------------------------------------------------------------------------
class AttackNodeSchema(BaseModel):
    id: str
    label: str
    node_type: str  # entry_point, vulnerability, service, endpoint, resource
    metadata: Optional[Dict[str, Any]] = None


class AttackEdgeSchema(BaseModel):
    id: str
    source: str
    target: str
    relation_type: str
    evidence: Optional[str] = None


class AttackPathGraphResponse(BaseModel):
    scan_id: str
    has_sufficient_evidence: bool
    notice: Optional[str] = None
    nodes: List[AttackNodeSchema] = []
    edges: List[AttackEdgeSchema] = []


# ---------------------------------------------------------------------------
# API Security (OpenAPI / Swagger) Schemas
# ---------------------------------------------------------------------------
class EndpointItem(BaseModel):
    method: str
    path: str
    summary: Optional[str] = None
    description: Optional[str] = None
    authentication_required: bool = False
    auth_type: Optional[str] = None
    parameters_count: int = 0
    findings_count: int = 0
    risk_level: str = "Low"  # Critical, High, Medium, Low, None


class ApiSpecAnalysisResponse(BaseModel):
    title: str
    version: str
    description: Optional[str] = None
    total_endpoints: int = 0
    authenticated_endpoints: int = 0
    unauthenticated_endpoints: int = 0
    endpoints: List[EndpointItem] = []


# ---------------------------------------------------------------------------
# LLM Provider Management Schemas
# ---------------------------------------------------------------------------
class ProviderStatusResponse(BaseModel):
    active_provider: str  # "GEMINI" or "OLLAMA"
    mode: str             # "AUTO", "GEMINI", "OLLAMA"
    gemini_status: str    # "Available", "Cooldown", "Error", "Not Configured"
    gemini_cooldown_remaining_seconds: int = 0
    gemini_last_error: Optional[str] = None
    gemini_model: str
    ollama_status: str    # "Available", "Offline", "Not Configured"
    ollama_url: str
    ollama_model: str
    fallback_history: List[Dict[str, Any]] = []


class ProviderModeUpdate(BaseModel):
    mode: str = Field(..., description="AUTO, GEMINI, or OLLAMA")
    ollama_url: Optional[str] = None
    ollama_model: Optional[str] = None
    gemini_model: Optional[str] = None


# ---------------------------------------------------------------------------
# AI Security Assistant Schemas
# ---------------------------------------------------------------------------
class AssistantChatRequest(BaseModel):
    query: str
    finding_id: Optional[str] = None
    scan_id: Optional[str] = None
    compare_scan_id: Optional[str] = None


class AssistantChatResponse(BaseModel):
    answer: str
    provider_used: str
    grounded_in_data: bool
    disclaimer: Optional[str] = None


# ---------------------------------------------------------------------------
# Report Schemas
# ---------------------------------------------------------------------------
class ReportGenerateRequest(BaseModel):
    scan_id: str
    format: str = Field("html", description="html, pdf, json")
    title: Optional[str] = None


class ReportResponse(BaseModel):
    id: str
    scan_id: str
    title: str
    format: str
    file_path: str
    download_url: str
    generated_at: datetime


# ---------------------------------------------------------------------------
# Dashboard Metrics Schema
# ---------------------------------------------------------------------------
class DashboardMetricsResponse(BaseModel):
    total_scans: int = 0
    active_scans: int = 0
    completed_scans: int = 0
    open_findings: int = 0
    critical_findings: int = 0
    high_findings: int = 0
    medium_findings: int = 0
    low_findings: int = 0
    info_findings: int = 0
    recent_scans: List[ScanResponse] = []
    recent_findings: List[FindingResponse] = []
    projects_count: int = 0
    provider_status: ProviderStatusResponse
    docker_running: bool = False
    strix_available: bool = False


# ---------------------------------------------------------------------------
# System Settings Schemas
# ---------------------------------------------------------------------------
class SystemSettingsResponse(BaseModel):
    app_name: str
    app_version: str
    strix_executable_path: str
    strix_available: bool
    strix_version: str
    docker_running: bool
    docker_status_text: str
    database_url: str
    reports_dir: str
    scans_run_dir: str
    llm_provider_mode: str
    gemini_api_key_status: str
    gemini_model: str
    ollama_url: str
    ollama_model: str
    default_scan_mode: str = "deep"
    default_max_budget: Optional[float] = None
    default_max_turns: Optional[int] = None


class SystemSettingsUpdate(BaseModel):
    strix_executable_path: Optional[str] = None
    default_scan_mode: Optional[str] = None
    default_max_budget: Optional[float] = None
    default_max_turns: Optional[int] = None
    reports_dir: Optional[str] = None

