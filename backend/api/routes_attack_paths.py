"""
API Routes for Attack Path Graph Visualization.

# Graph Theory — representing data as interconnected points (nodes) and connecting lines (edges).
# Attack Path — a sequence of vulnerabilities and weaknesses chained together by an adversary to reach a sensitive asset.
# Directed Edge — a relationship that has a specific direction (e.g. entry_point -> vulnerability -> endpoint).
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from backend.database.connection import get_db
from backend.database.models import AttackPathNode, AttackPathEdge, Scan, Finding
from backend.schemas.api_schemas import (
    AttackPathGraphResponse,
    AttackNodeSchema,
    AttackEdgeSchema,
)

router = APIRouter(prefix="/api/attack-paths", tags=["Attack Paths"])


class ManualEdgeCreate(BaseModel):
    source_id: str
    target_id: str
    relation_type: str = "chains_to"
    evidence: Optional[str] = None


@router.get("/{scan_id}", response_model=AttackPathGraphResponse)
async def get_attack_path_graph(scan_id: str, db: AsyncSession = Depends(get_db)):
    """
    Returns graph representation of attack paths for a given scan.
    Explicitly indicates when evidence is insufficient rather than inventing fake paths.
    """
    s_res = await db.execute(select(Scan).where(Scan.id == scan_id))
    scan = s_res.scalar_one_or_none()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    # Query nodes and edges
    nodes_res = await db.execute(
        select(AttackPathNode).where(AttackPathNode.scan_id == scan_id)
    )
    nodes = nodes_res.scalars().all()

    edges_res = await db.execute(
        select(AttackPathEdge).where(AttackPathEdge.scan_id == scan_id)
    )
    edges = edges_res.scalars().all()

    # If no edges or only an entry node exists with no vulnerabilities
    if not nodes or len(nodes) <= 1:
        return AttackPathGraphResponse(
            scan_id=scan_id,
            has_sufficient_evidence=False,
            notice="Insufficient evidence to construct an attack path. Scan results do not provide vulnerability chain data.",
            nodes=[],
            edges=[],
        )

    node_schemas = [
        AttackNodeSchema(
            id=n.node_id,
            label=n.label,
            node_type=n.node_type,
            metadata=n.metadata_json,
        )
        for n in nodes
    ]

    edge_schemas = [
        AttackEdgeSchema(
            id=e.id,
            source=e.source_id,
            target=e.target_id,
            relation_type=e.relation_type,
            evidence=e.evidence,
        )
        for e in edges
    ]

    return AttackPathGraphResponse(
        scan_id=scan_id,
        has_sufficient_evidence=True,
        nodes=node_schemas,
        edges=edge_schemas,
    )


@router.post("/{scan_id}/edges")
async def add_manual_attack_edge(
    scan_id: str,
    payload: ManualEdgeCreate,
    db: AsyncSession = Depends(get_db),
):
    """
    Allows a security engineer to manually correlate two nodes in an attack path.
    """
    edge = AttackPathEdge(
        scan_id=scan_id,
        source_id=payload.source_id,
        target_id=payload.target_id,
        relation_type=payload.relation_type,
        evidence=payload.evidence,
    )
    db.add(edge)
    await db.commit()
    await db.refresh(edge)
    return {"message": "Attack path relationship added.", "edge_id": edge.id}
