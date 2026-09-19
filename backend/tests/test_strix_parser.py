"""
Automated tests for Strix output and SARIF 2.1.0 parsing.
"""

import os
import pytest
from backend.integrations.strix.strix_parser import (
    parse_strix_run_directory,
    map_sarif_severity,
)


def test_parse_real_strix_run_directory():
    # Test on the real discovered Strix run in SignBridgeAI
    sample_dir = r"C:\Users\saabi\OneDrive\Desktop\SignBridgeAI\strix_runs\signbridgeai_e541"
    if not os.path.exists(sample_dir):
        pytest.skip("Sample Strix run directory not present on this machine.")

    metadata, findings, coverage = parse_strix_run_directory(sample_dir)
    assert metadata is not None
    assert metadata.run_id == "signbridgeai_e541"
    assert metadata.status == "running" or metadata.status == "completed"
    assert len(metadata.targets_info) > 0


def test_map_sarif_severity():
    # Test rule security-severity score mapping
    rule_crit = {"properties": {"security-severity": "9.5"}}
    assert map_sarif_severity({}, rule_crit) == "Critical"

    rule_high = {"properties": {"security-severity": "7.8"}}
    assert map_sarif_severity({}, rule_high) == "High"

    rule_med = {"properties": {"security-severity": "5.2"}}
    assert map_sarif_severity({}, rule_med) == "Medium"

    rule_low = {"properties": {"security-severity": "2.0"}}
    assert map_sarif_severity({}, rule_low) == "Low"

    # Test level fallback
    assert map_sarif_severity({"level": "error"}, {}) == "High"
    assert map_sarif_severity({"level": "warning"}, {}) == "Medium"
    assert map_sarif_severity({"level": "note"}, {}) == "Low"
