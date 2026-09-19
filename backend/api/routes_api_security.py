"""
API Routes for OpenAPI / Swagger Security Analysis.

# OpenAPI / Swagger — a standard specification format for describing REST APIs, endpoints, and authentication schemes.
# API Surface Discovery — mapping all exposed API routes and input parameters to identify unauthenticated or high-risk endpoints.
"""

import os
import json
import yaml
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Form
from pydantic import BaseModel

from backend.core.config import settings
from backend.core.logging import logger
from backend.schemas.api_schemas import (
    ApiSpecAnalysisResponse,
    EndpointItem,
)

router = APIRouter(prefix="/api/api-security", tags=["API Security"])


def parse_openapi_spec(spec_data: Dict[str, Any]) -> ApiSpecAnalysisResponse:
    """
    Parses OpenAPI 3.x or Swagger 2.0 dict into structured endpoint models.
    """
    info = spec_data.get("info", {})
    title = info.get("title", "OpenAPI Specification")
    version = info.get("version", "1.0.0")
    description = info.get("description", "")

    # Check for global security requirements
    global_security = spec_data.get("security", [])
    has_global_auth = len(global_security) > 0

    endpoints: List[EndpointItem] = []
    paths = spec_data.get("paths", {})

    total_ep = 0
    auth_ep = 0
    unauth_ep = 0

    for path_str, path_item in paths.items():
        if not isinstance(path_item, dict):
            continue

        for method in ["get", "post", "put", "patch", "delete", "options", "head"]:
            if method in path_item:
                op = path_item[method]
                if not isinstance(op, dict):
                    continue

                total_ep += 1
                op_security = op.get("security")
                # If explicitly overridden as [] in operation, it is unauthenticated
                if op_security is not None:
                    is_auth = len(op_security) > 0
                else:
                    is_auth = has_global_auth

                if is_auth:
                    auth_ep += 1
                else:
                    unauth_ep += 1

                summary = op.get("summary") or op.get("operationId") or ""
                op_desc = op.get("description", "")
                params = op.get("parameters", [])

                # Simple risk indicator heuristic
                risk = "Low"
                if not is_auth and method in ["post", "put", "delete", "patch"]:
                    risk = "High"
                elif method in ["delete"]:
                    risk = "Medium"

                endpoints.append(
                    EndpointItem(
                        method=method.upper(),
                        path=path_str,
                        summary=summary,
                        description=op_desc,
                        authentication_required=is_auth,
                        auth_type="Configured" if is_auth else "None",
                        parameters_count=len(params),
                        risk_level=risk,
                    )
                )

    return ApiSpecAnalysisResponse(
        title=title,
        version=version,
        description=description,
        total_endpoints=total_ep,
        authenticated_endpoints=auth_ep,
        unauthenticated_endpoints=unauth_ep,
        endpoints=endpoints,
    )


@router.post("/parse-file", response_model=ApiSpecAnalysisResponse)
async def upload_and_parse_spec(file: UploadFile = File(...)):
    """
    Uploads an OpenAPI/Swagger file (.json or .yaml) and inspects endpoints and auth posture.
    """
    content = await file.read()
    filename = file.filename.lower() if file.filename else ""

    try:
        if filename.endswith(".yaml") or filename.endswith(".yml"):
            spec_dict = yaml.safe_load(content.decode("utf-8", errors="replace"))
        else:
            spec_dict = json.loads(content.decode("utf-8", errors="replace"))
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse specification. Ensure valid JSON or YAML format: {exc}",
        )

    if not isinstance(spec_dict, dict) or "paths" not in spec_dict:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is missing required OpenAPI 'paths' section.",
        )

    # Save to SCANS_RUN_DIR for scan reference
    save_path = os.path.join(settings.SCANS_RUN_DIR, f"spec_{file.filename}")
    with open(save_path, "wb") as f:
        f.write(content)

    return parse_openapi_spec(spec_dict)


class RawSpecInput(BaseModel):
    raw_spec: str
    format: str = "json"  # json or yaml


@router.post("/parse-raw", response_model=ApiSpecAnalysisResponse)
async def parse_raw_spec(payload: RawSpecInput):
    """
    Parses pasted OpenAPI or Swagger raw text.
    """
    try:
        if payload.format == "yaml":
            spec_dict = yaml.safe_load(payload.raw_spec)
        else:
            spec_dict = json.loads(payload.raw_spec)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Parse error: {exc}")

    if not isinstance(spec_dict, dict) or "paths" not in spec_dict:
        raise HTTPException(status_code=400, detail="Missing required 'paths' section.")

    return parse_openapi_spec(spec_dict)
