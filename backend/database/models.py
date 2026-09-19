"""
SQLAlchemy database models for the AI Security Testing Platform.

# SQLAlchemy — a library that lets us query and manage the database using Python classes.
# ORM (Object-Relational Mapping) — maps Python classes directly to database tables.
# Foreign Key — creates a relationship linking one table's rows to another table's rows.
"""

from datetime import datetime
from typing import Optional, List
import uuid

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    DateTime,
    ForeignKey,
    Text,
    Boolean,
    JSON,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


def generate_uuid() -> str:
    """Generate a clean string UUID for primary keys."""
    return str(uuid.uuid4())


class Project(Base):
    """
    Represents an authorized project or application under test.
    """
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    target_type = Column(String(50), nullable=False)  # local_project, github_repo, web_app, api_spec
    target_value = Column(String(1024), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scans = relationship("Scan", back_populates="project", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="project", cascade="all, delete-orphan")


class Scan(Base):
    """
    Represents an execution of a Strix security scan.
    """
    __tablename__ = "scans"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    target_type = Column(String(50), nullable=False)  # local_project, github_repo, web_app, api_spec
    target_value = Column(String(1024), nullable=False)
    scan_mode = Column(String(50), default="deep")  # quick, standard, deep
    instruction = Column(Text, nullable=True)
    max_budget = Column(Float, nullable=True)
    max_turns = Column(Integer, nullable=True)
    
    # Status lifecycle: Queued, Starting, Running, Completed, Failed, Cancelled
    status = Column(String(50), default="Queued", index=True)
    
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    elapsed_seconds = Column(Integer, default=0)
    
    # Strix run name (e.g. signbridgeai_e541), corresponding to the folder under strix_runs/
    strix_run_name = Column(String(255), nullable=True, index=True)
    
    # Active LLM provider used during this run (GEMINI or OLLAMA)
    provider_used = Column(String(50), default="GEMINI")
    exit_code = Column(Integer, nullable=True)
    raw_summary = Column(JSON, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="scans")
    findings = relationship("Finding", back_populates="scan", cascade="all, delete-orphan")
    logs = relationship("ScanLog", back_populates="scan", cascade="all, delete-orphan")
    attack_nodes = relationship("AttackPathNode", back_populates="scan", cascade="all, delete-orphan")
    attack_edges = relationship("AttackPathEdge", back_populates="scan", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="scan", cascade="all, delete-orphan")


class Finding(Base):
    """
    Represents a specific vulnerability or security finding identified during an assessment.
    """
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=True, index=True)
    
    title = Column(String(512), nullable=False, index=True)
    # Severity: Critical, High, Medium, Low, Informational
    severity = Column(String(50), nullable=False, index=True)
    # Category: OWASP Top 10, CWE identifier, or Strix classification
    category = Column(String(255), nullable=False, default="General Security", index=True)
    
    description = Column(Text, nullable=False)
    location = Column(String(1024), nullable=True)  # File path or URL
    endpoint = Column(String(512), nullable=True)  # Specific HTTP endpoint if applicable
    evidence = Column(Text, nullable=True)          # Real trace, payload, or code excerpt
    impact = Column(Text, nullable=True)            # Real business or technical risk
    recommendation = Column(Text, nullable=True)    # Remediation advice
    
    # Status: Open, Confirmed, Fixed, Accepted Risk, Retest Required
    status = Column(String(50), default="Open", index=True)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    scan = relationship("Scan", back_populates="findings")
    project = relationship("Project", back_populates="findings")
    notes = relationship("FindingNote", back_populates="finding", cascade="all, delete-orphan")
    retests = relationship("RetestHistory", back_populates="finding", cascade="all, delete-orphan")


class ScanLog(Base):
    """
    Real-time log stream lines captured during a Strix scan run.
    """
    __tablename__ = "scan_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    level = Column(String(20), default="INFO")
    message = Column(Text, nullable=False)
    source = Column(String(50), default="strix")  # strix, runner, backend

    scan = relationship("Scan", back_populates="logs")


class AttackPathNode(Base):
    """
    Represents a graph node in the attack path visualization.
    """
    __tablename__ = "attack_path_nodes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    node_id = Column(String(100), nullable=False)  # Unique ID in the graph
    label = Column(String(255), nullable=False)
    # Types: entry_point, vulnerability, service, endpoint, resource
    node_type = Column(String(50), nullable=False)
    metadata_json = Column(JSON, nullable=True)

    scan = relationship("Scan", back_populates="attack_nodes")


class AttackPathEdge(Base):
    """
    Represents a directed relationship between two nodes in an attack path.
    """
    __tablename__ = "attack_path_edges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    source_id = Column(String(100), nullable=False)
    target_id = Column(String(100), nullable=False)
    relation_type = Column(String(100), default="exploits")
    evidence = Column(Text, nullable=True)

    scan = relationship("Scan", back_populates="attack_edges")


class Report(Base):
    """
    Exported audit/security report document.
    """
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    scan_id = Column(String(36), ForeignKey("scans.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    report_format = Column(String(20), nullable=False)  # html, pdf, json
    file_path = Column(String(1024), nullable=False)
    generated_at = Column(DateTime, default=datetime.utcnow)

    scan = relationship("Scan", back_populates="reports")


class FindingNote(Base):
    """
    Engineer notes attached to a finding.
    """
    __tablename__ = "finding_notes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id"), nullable=False, index=True)
    author = Column(String(100), default="Security Analyst")
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    finding = relationship("Finding", back_populates="notes")


class RetestHistory(Base):
    """
    Audit log of fix verification and retests for a finding.
    """
    __tablename__ = "retest_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id"), nullable=False, index=True)
    original_scan_id = Column(String(36), nullable=False)
    retest_scan_id = Column(String(36), nullable=True)
    previous_status = Column(String(50), nullable=False)
    new_status = Column(String(50), nullable=False)
    # Result: Resolved, Still Present, Changed, Unable to Verify
    result = Column(String(50), nullable=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    finding = relationship("Finding", back_populates="retests")
