"""
Parser for Strix scan output files (SARIF 2.1.0 and run.json).

# SARIF Parser — reads standardized vulnerability reports and converts them into our application's finding models.
# Data Mapping — transforming raw security engine output into structured database objects.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

from backend.core.logging import logger
from backend.integrations.strix.strix_models import (
    StrixRunMetadata,
    StrixFindingItem,
)


def parse_strix_run_directory(run_dir: str) -> Tuple[Optional[StrixRunMetadata], List[StrixFindingItem], Dict[str, Any]]:
    """
    Reads and parses a complete Strix run directory containing run.json and findings.sarif.
    Returns: (metadata, findings_list, coverage_info)
    """
    path = Path(run_dir)
    if not path.exists() or not path.is_dir():
        logger.warning(f"Strix run directory not found: {run_dir}")
        return None, [], {}

    metadata = None
    findings: List[StrixFindingItem] = []
    coverage: Dict[str, Any] = {}

    # 1. Parse run.json
    run_json_path = path / "run.json"
    if run_json_path.exists():
        try:
            with open(run_json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                metadata = StrixRunMetadata(
                    run_id=data.get("run_id", path.name),
                    run_name=data.get("run_name", path.name),
                    start_time=data.get("start_time"),
                    end_time=data.get("end_time"),
                    status=data.get("status", "completed"),
                    auth_mode=data.get("auth_mode"),
                    targets_info=data.get("targets_info", []),
                    llm_usage=data.get("llm_usage", {}),
                )
        except Exception as exc:
            logger.error(f"Error reading {run_json_path}: {exc}")

    # 2. Parse findings.sarif (SARIF 2.1.0 Standard)
    sarif_path = path / "findings.sarif"
    if sarif_path.exists():
        try:
            with open(sarif_path, "r", encoding="utf-8") as f:
                sarif_data = json.load(f)
                runs = sarif_data.get("runs", [])
                for r in runs:
                    tool_driver = r.get("tool", {}).get("driver", {})
                    rules_list = tool_driver.get("rules", [])
                    rules_map = {rule.get("id"): rule for rule in rules_list if "id" in rule}

                    results = r.get("results", [])
                    for res in results:
                        rule_id = res.get("ruleId", "UNKNOWN_RULE")
                        rule_meta = rules_map.get(rule_id, {})

                        # Extract title
                        title = (
                            rule_meta.get("shortDescription", {}).get("text")
                            or rule_meta.get("name")
                            or res.get("message", {}).get("text", "Unnamed Vulnerability")
                        )

                        # Extract description & recommendation
                        desc = (
                            rule_meta.get("fullDescription", {}).get("text")
                            or res.get("message", {}).get("text", "")
                        )
                        recommendation = rule_meta.get("help", {}).get("text")

                        # Severity classification
                        severity = map_sarif_severity(res, rule_meta)

                        # Category from tags / properties
                        tags = rule_meta.get("properties", {}).get("tags", [])
                        category = tags[0] if tags else "Application Security"

                        # Extract location and endpoint
                        location_str, endpoint_str = extract_location_info(res)

                        # Extract evidence
                        evidence_str = None
                        code_flows = res.get("codeFlows", [])
                        if code_flows:
                            evidence_str = json.dumps(code_flows, indent=2)
                        elif "properties" in res and "evidence" in res["properties"]:
                            evidence_str = str(res["properties"]["evidence"])
                        elif "message" in res and "text" in res["message"]:
                            evidence_str = res["message"]["text"]

                        finding_item = StrixFindingItem(
                            title=title,
                            severity=severity,
                            category=category,
                            description=desc,
                            location=location_str,
                            endpoint=endpoint_str,
                            evidence=evidence_str,
                            impact=rule_meta.get("properties", {}).get("impact"),
                            recommendation=recommendation,
                            raw_rule_id=rule_id,
                        )
                        findings.append(finding_item)
        except Exception as exc:
            logger.error(f"Error parsing {sarif_path}: {exc}")

    # 3. Parse coverage.json if present
    coverage_path = path / "coverage.json"
    if coverage_path.exists():
        try:
            with open(coverage_path, "r", encoding="utf-8") as f:
                coverage = json.load(f)
        except Exception as exc:
            logger.debug(f"Error reading coverage.json: {exc}")

    return metadata, findings, coverage


def map_sarif_severity(result: Dict[str, Any], rule_meta: Dict[str, Any]) -> str:
    """
    Translates SARIF result level and security-severity scores into standard severities:
    Critical, High, Medium, Low, Informational.
    """
    props = rule_meta.get("properties", {})
    score = props.get("security-severity")
    if score is not None:
        try:
            val = float(score)
            if val >= 9.0:
                return "Critical"
            if val >= 7.0:
                return "High"
            if val >= 4.0:
                return "Medium"
            if val > 0.0:
                return "Low"
        except (ValueError, TypeError):
            pass

    level = result.get("level", "warning").lower()
    if level == "error":
        return "High"
    elif level == "warning":
        return "Medium"
    elif level == "note":
        return "Low"
    return "Informational"


def extract_location_info(result: Dict[str, Any]) -> Tuple[Optional[str], Optional[str]]:
    """
    Extracts physical file path and HTTP endpoint from SARIF locations.
    """
    locations = result.get("locations", [])
    if not locations:
        return None, None

    first_loc = locations[0]
    phys = first_loc.get("physicalLocation", {})
    uri = phys.get("artifactLocation", {}).get("uri")
    region = phys.get("region", {})
    start_line = region.get("startLine")

    loc_str = None
    if uri:
        loc_str = f"{uri}:{start_line}" if start_line else uri

    endpoint_str = None
    if uri and (uri.startswith("http://") or uri.startswith("https://") or uri.startswith("/api/")):
        endpoint_str = uri

    return loc_str, endpoint_str
