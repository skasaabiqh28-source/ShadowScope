"""
Asynchronous Strix CLI runner and process orchestrator.

# Subprocess — executes external programs from Python safely by passing arguments as an explicit list.
# Non-blocking I/O — reads output streams continuously without freezing the main application event loop.
# Background Task — long-running operations executed independently of HTTP web requests.
"""

import os
import sys
import shutil
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List, Callable, Any

from backend.core.config import settings
from backend.core.logging import logger, redact_secrets
from backend.core.security import sanitize_argument
from backend.integrations.llm.provider_manager import provider_manager
from backend.integrations.strix.strix_parser import parse_strix_run_directory


# Global active process tracker: scan_id -> asyncio.subprocess.Process
ACTIVE_PROCESSES: Dict[str, asyncio.subprocess.Process] = {}

# In-memory log subscriber callbacks: scan_id -> list of async listener callables
LOG_LISTENERS: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}


def resolve_strix_executable() -> str:
    """
    Locates the Strix CLI executable on Windows or other operating systems.
    Prioritizes configured path, then system PATH.
    """
    cfg_path = settings.STRIX_EXECUTABLE
    if cfg_path and os.path.isfile(cfg_path):
        return cfg_path

    which_path = shutil.which("strix") or shutil.which("strix.exe")
    if which_path:
        return which_path

    # Check common Windows Python Scripts paths as a helper fallback
    py_scripts = [
        r"C:\Users\saabi\AppData\Local\Programs\Python\Python313\Scripts\strix.exe",
        os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python313\Scripts\strix.exe"),
    ]
    for p in py_scripts:
        if os.path.isfile(p):
            return p

    raise FileNotFoundError(
        "Strix executable was not found. Configure STRIX_EXECUTABLE or add Strix to PATH."
    )


def register_log_listener(scan_id: str, callback: Callable[[Dict[str, Any]], None]) -> None:
    """Registers a listener function to receive live log lines for a specific scan."""
    if scan_id not in LOG_LISTENERS:
        LOG_LISTENERS[scan_id] = []
    LOG_LISTENERS[scan_id].append(callback)


def unregister_log_listener(scan_id: str, callback: Callable[[Dict[str, Any]], None]) -> None:
    """Removes a previously registered listener function."""
    if scan_id in LOG_LISTENERS and callback in LOG_LISTENERS[scan_id]:
        LOG_LISTENERS[scan_id].remove(callback)


async def emit_scan_log(scan_id: str, level: str, raw_message: str, source: str = "strix") -> None:
    """
    Redacts secrets and broadcasts a log message to all active listeners.
    """
    clean_msg = redact_secrets(raw_message.strip())
    if not clean_msg:
        return

    log_entry = {
        "scan_id": scan_id,
        "timestamp": datetime.utcnow().isoformat(),
        "level": level,
        "message": clean_msg,
        "source": source,
    }

    # Notify memory listeners (e.g. WebSocket connections)
    listeners = LOG_LISTENERS.get(scan_id, [])
    for listener in listeners:
        try:
            if asyncio.iscoroutinefunction(listener):
                await listener(log_entry)
            else:
                listener(log_entry)
        except Exception:
            pass


async def execute_strix_scan(
    scan_id: str,
    target: str,
    scan_mode: str = "deep",
    instruction: Optional[str] = None,
    max_budget: Optional[float] = None,
    max_turns: Optional[int] = None,
    resume_run_name: Optional[str] = None,
    on_log_callback: Optional[Callable[[str, str, str], Any]] = None,
    on_complete_callback: Optional[Callable[[str, int, Optional[str], str], Any]] = None,
) -> None:
    """
    Main asynchronous background worker that runs Strix CLI.
    """
    try:
        strix_exe = resolve_strix_executable()
    except FileNotFoundError as fnf_err:
        await emit_scan_log(scan_id, "ERROR", str(fnf_err), source="runner")
        if on_complete_callback:
            await on_complete_callback(scan_id, 1, None, "Failed")
        return

    # Create a dedicated run workspace directory inside SCANS_RUN_DIR
    run_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.join(settings.SCANS_RUN_DIR, f"scan_{scan_id[:8]}_{run_timestamp}")
    os.makedirs(run_dir, exist_ok=True)

    # Generate custom Strix configuration with active LLM provider (Gemini or Ollama fallback)
    config_file_path, active_provider = provider_manager.generate_strix_config(run_dir)

    # Construct arguments securely as a structured list (NO shell=True)
    cmd: List[str] = [
        strix_exe,
        "--target", sanitize_argument(target),
        "--scan-mode", sanitize_argument(scan_mode),
        "--non-interactive",
        "--config", config_file_path,
    ]

    if instruction:
        cmd.extend(["--instruction", sanitize_argument(instruction)])

    if max_budget is not None and max_budget > 0:
        cmd.extend(["--max-budget", str(max_budget)])

    if max_turns is not None and max_turns > 0:
        cmd.extend(["--max-turns", str(max_turns)])

    if resume_run_name:
        cmd.extend(["--resume", sanitize_argument(resume_run_name)])

    await emit_scan_log(
        scan_id,
        "INFO",
        f"Starting Strix scan with provider [{active_provider}] in {scan_mode.upper()} mode.",
        source="runner",
    )
    await emit_scan_log(
        scan_id,
        "INFO",
        f"Command: {os.path.basename(strix_exe)} --target {target} --scan-mode {scan_mode} --non-interactive",
        source="runner",
    )

    exit_code = 0
    final_status = "Completed"
    strix_run_name: Optional[str] = None

    try:
        # Launch subprocess asynchronously using current working directory
        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=os.path.abspath(settings.SCANS_RUN_DIR),
        )

        ACTIVE_PROCESSES[scan_id] = process

        # Asynchronously consume stdout and stderr lines in parallel
        async def stream_reader(stream: asyncio.StreamReader, level: str):
            nonlocal strix_run_name
            while not stream.at_eof():
                line = await stream.readline()
                if not line:
                    break
                decoded = line.decode("utf-8", errors="replace").rstrip()
                if decoded:
                    # Detect run name or run ID if Strix logs it
                    if "Starting Strix scan " in decoded:
                        parts = decoded.split("Starting Strix scan ")
                        if len(parts) > 1:
                            strix_run_name = parts[1].split()[0]

                    await emit_scan_log(scan_id, level, decoded, source="strix")
                    if on_log_callback:
                        await on_log_callback(scan_id, level, decoded)

        await asyncio.gather(
            stream_reader(process.stdout, "INFO"),
            stream_reader(process.stderr, "WARNING"),
        )

        exit_code = await process.wait()

        if exit_code == 0:
            final_status = "Completed"
            await emit_scan_log(scan_id, "INFO", "Strix scan completed successfully.", source="runner")
        elif exit_code == -15 or exit_code == 15 or exit_code == 1:
            # Check if process was cancelled
            if scan_id not in ACTIVE_PROCESSES:
                final_status = "Cancelled"
                await emit_scan_log(scan_id, "WARNING", "Scan was cancelled by user.", source="runner")
            else:
                final_status = "Failed"
                await emit_scan_log(scan_id, "ERROR", f"Strix exited with code {exit_code}.", source="runner")
        else:
            final_status = "Failed"
            await emit_scan_log(scan_id, "ERROR", f"Strix exited with code {exit_code}.", source="runner")

    except asyncio.CancelledError:
        final_status = "Cancelled"
        if scan_id in ACTIVE_PROCESSES:
            proc = ACTIVE_PROCESSES[scan_id]
            try:
                proc.terminate()
            except Exception:
                pass
        await emit_scan_log(scan_id, "WARNING", "Scan task was cancelled.", source="runner")
    except Exception as exc:
        final_status = "Failed"
        exit_code = 1
        await emit_scan_log(scan_id, "ERROR", f"Subprocess runner error: {str(exc)}", source="runner")
    finally:
        ACTIVE_PROCESSES.pop(scan_id, None)
        if on_complete_callback:
            await on_complete_callback(scan_id, exit_code, strix_run_name, final_status)


def cancel_active_scan(scan_id: str) -> bool:
    """
    Terminates an ongoing Strix scan process safely.
    """
    proc = ACTIVE_PROCESSES.get(scan_id)
    if proc:
        try:
            logger.info(f"Terminating active Strix process for scan {scan_id}")
            proc.terminate()
            ACTIVE_PROCESSES.pop(scan_id, None)
            return True
        except Exception as exc:
            logger.error(f"Failed to terminate process for scan {scan_id}: {exc}")
            try:
                proc.kill()
                ACTIVE_PROCESSES.pop(scan_id, None)
                return True
            except Exception:
                pass
    return False
