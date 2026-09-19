"""
Asynchronous Strix CLI runner and process orchestrator.

# Subprocess — executes external programs from Python safely by passing arguments as an explicit list.
# Non-blocking I/O — reads output streams continuously without freezing the main application event loop.
# Background Task — long-running operations executed independently of HTTP web requests.
"""

import os
import re
import sys
import time
import shutil
import asyncio
import subprocess
import threading
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List, Callable, Any

from backend.core.config import settings
from backend.core.logging import logger, redact_secrets
from backend.core.security import sanitize_argument
from backend.integrations.llm.provider_manager import provider_manager
from backend.integrations.strix.strix_parser import parse_strix_run_directory


# Global active process tracker: scan_id -> subprocess.Popen
ACTIVE_PROCESSES: Dict[str, subprocess.Popen] = {}

# In-memory log subscriber callbacks: scan_id -> list of async listener callables
LOG_LISTENERS: Dict[str, List[Callable[[Dict[str, Any]], None]]] = {}


def resolve_strix_executable() -> str:
    """
    Locates the Strix CLI executable cross-platform.
    Prioritizes configured path, then system PATH, then the Python Scripts dir.
    """
    cfg_path = settings.STRIX_EXECUTABLE
    if cfg_path and cfg_path != "strix" and os.path.isfile(cfg_path):
        return cfg_path

    which_path = shutil.which("strix") or shutil.which("strix.exe")
    if which_path:
        return which_path

    # Fallback: check the Scripts/bin directory of the current Python installation
    # Works on both Windows (Scripts\strix.exe) and Linux (bin/strix)
    scripts_dir = os.path.join(os.path.dirname(sys.executable), "Scripts" if sys.platform == "win32" else "")
    if sys.platform != "win32":
        scripts_dir = os.path.dirname(sys.executable)
    strix_in_scripts = os.path.join(scripts_dir, "strix.exe" if sys.platform == "win32" else "strix")
    if os.path.isfile(strix_in_scripts):
        return strix_in_scripts

    raise FileNotFoundError(
        "Strix executable was not found. Install with 'pip install strix-agent', "
        "configure STRIX_EXECUTABLE, or add Strix to PATH."
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


ANSI_ESCAPE_REGEX = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')


def strip_ansi(text: str) -> str:
    """Removes ANSI color and cursor control sequences for clean log storage."""
    return ANSI_ESCAPE_REGEX.sub('', text)


async def execute_strix_scan(
    scan_id: str,
    target: str,
    scan_mode: str = "deep",
    instruction: Optional[str] = None,
    max_budget: Optional[float] = None,
    max_turns: Optional[int] = None,
    resume_run_name: Optional[str] = None,
    on_log_callback: Optional[Callable[[str, str, str], Any]] = None,
    on_complete_callback: Optional[Callable[[str, int, Optional[str], str, Optional[str]], Any]] = None,
) -> None:
    """
    Main asynchronous background worker that runs Strix CLI.
    """
    async def log_both(level: str, msg: str, source: str = "runner"):
        clean = strip_ansi(msg)
        await emit_scan_log(scan_id, level, clean, source=source)
        if on_log_callback:
            try:
                await on_log_callback(scan_id, level, clean)
            except Exception:
                pass

    try:
        strix_exe = resolve_strix_executable()
    except FileNotFoundError as fnf_err:
        await log_both("ERROR", str(fnf_err), source="runner")
        if on_complete_callback:
            await on_complete_callback(scan_id, 1, None, "Failed", "GEMINI")
        return

    # Create a dedicated run workspace directory inside SCANS_RUN_DIR
    run_timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    run_dir = os.path.abspath(os.path.join(settings.SCANS_RUN_DIR, f"scan_{scan_id[:8]}_{run_timestamp}"))
    os.makedirs(run_dir, exist_ok=True)

    # Generate custom Strix configuration with active LLM provider (Gemini or Ollama fallback)
    config_file_path, active_provider, env_vars = provider_manager.generate_strix_config(run_dir)
    config_file_path = os.path.abspath(config_file_path)

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

    await log_both(
        "INFO",
        f"Starting Strix scan with provider [{active_provider}] in {scan_mode.upper()} mode.",
        source="runner",
    )
    await log_both(
        "INFO",
        f"Target: {target}",
        source="runner",
    )
    await log_both(
        "INFO",
        f"Command: {os.path.basename(strix_exe)} --target {target} --scan-mode {scan_mode} --non-interactive",
        source="runner",
    )

    exit_code = 0
    final_status = "Completed"
    strix_run_name: Optional[str] = None

    # Construct child process environment with LLM settings
    sub_env = os.environ.copy()
    sub_env.update(env_vars)
    sub_env["PYTHONUNBUFFERED"] = "1"
    sub_env["PYTHONIOENCODING"] = "utf-8"
    sub_env["FORCE_COLOR"] = "0"

    loop = asyncio.get_running_loop()

    try:
        # Launch subprocess using subprocess.Popen (immune to Windows SelectorEventLoop NotImplementedError)
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,  # Merges stdout and stderr into one stream in exact PowerShell order
            cwd=os.path.abspath(settings.SCANS_RUN_DIR),
            env=sub_env,
            text=True,
            encoding="utf-8",
            errors="replace",
            bufsize=1,  # Line-buffered
        )

        ACTIVE_PROCESSES[scan_id] = process

        waiting_first_response = False
        wait_start_time = 0.0
        warned_wait = False
        stop_watchdog = threading.Event()

        def watchdog():
            nonlocal waiting_first_response, wait_start_time, warned_wait
            while not stop_watchdog.wait(timeout=5.0):
                if waiting_first_response and not warned_wait:
                    elapsed = time.time() - wait_start_time
                    if elapsed >= 60.0:
                        warned_wait = True
                        asyncio.run_coroutine_threadsafe(
                            log_both(
                                "WARNING",
                                "Model response is taking longer than expected (>60s). If Gemini rate limit (429) was reached or connection is slow, consider switching provider to Ollama or checking your API key quota.",
                                source="runner",
                            ),
                            loop,
                        )

        watchdog_thread = threading.Thread(target=watchdog, daemon=True)
        watchdog_thread.start()

        def stream_reader():
            nonlocal strix_run_name, waiting_first_response, wait_start_time
            if not process.stdout:
                return
            for line in iter(process.stdout.readline, ""):
                raw_line = line.rstrip("\r\n")
                if not raw_line:
                    continue
                clean = strip_ansi(raw_line)
                if not clean:
                    continue

                # Detect run name or run ID if Strix logs it
                if "Starting Strix scan " in clean:
                    parts = clean.split("Starting Strix scan ")
                    if len(parts) > 1:
                        strix_run_name = parts[1].split()[0]

                level = "INFO"
                lower_line = clean.lower()

                # Track "Waiting for the first model response..."
                if "waiting for the first model response" in lower_line:
                    waiting_first_response = True
                    wait_start_time = time.time()
                elif waiting_first_response and len(clean.strip()) > 0:
                    waiting_first_response = False

                if "error:" in lower_line or "traceback" in lower_line or "failed" in lower_line:
                    level = "ERROR"
                elif "warning" in lower_line or "model quality warning" in lower_line:
                    level = "WARNING"

                # Detect rate limits or 429 errors directly in stream
                if "429" in lower_line or "ratelimit" in lower_line or "quota exceeded" in lower_line:
                    level = "ERROR"
                    if active_provider == "GEMINI":
                        provider_manager.trigger_gemini_cooldown("Quota exceeded (HTTP 429) detected during Strix scan")

                asyncio.run_coroutine_threadsafe(
                    emit_scan_log(scan_id, level, clean, source="strix"),
                    loop,
                )
                if on_log_callback:
                    asyncio.run_coroutine_threadsafe(
                        on_log_callback(scan_id, level, clean),
                        loop,
                    )
            try:
                process.stdout.close()
            except Exception:
                pass

        reader_thread = threading.Thread(target=stream_reader, daemon=True)
        reader_thread.start()

        # Wait for the process to complete in a thread worker without blocking the event loop
        exit_code = await asyncio.to_thread(process.wait)
        stop_watchdog.set()
        reader_thread.join(timeout=3.0)
        watchdog_thread.join(timeout=1.0)

        if exit_code == 0:
            final_status = "Completed"
            await log_both("INFO", "Strix scan completed successfully.", source="runner")
        elif exit_code in (-15, 15):
            final_status = "Cancelled"
            await log_both("WARNING", "Scan was cancelled by user.", source="runner")
        elif scan_id not in ACTIVE_PROCESSES:
            final_status = "Cancelled"
            await log_both("WARNING", "Scan was cancelled by user.", source="runner")
        else:
            final_status = "Failed"
            await log_both("ERROR", f"Strix exited with code {exit_code}.", source="runner")

            # Inspect any generated strix.log in run_dir or scans directory to surface the exact error to the user
            try:
                log_candidates = []
                for root, _, files in os.walk(settings.SCANS_RUN_DIR):
                    for f in files:
                        if f == "strix.log":
                            log_candidates.append(os.path.join(root, f))
                if log_candidates:
                    latest_log = max(log_candidates, key=os.path.getmtime)
                    if time.time() - os.path.getmtime(latest_log) < 120:
                        with open(latest_log, "r", encoding="utf-8", errors="replace") as lf:
                            content = lf.read()
                            if "429" in content or "Quota exceeded" in content or "RateLimitError" in content:
                                await log_both(
                                    "ERROR",
                                    "Strix error: Gemini rate limit / free tier quota exceeded (HTTP 429).",
                                    source="strix",
                                )
                                if active_provider == "GEMINI":
                                    provider_manager.trigger_gemini_cooldown("Quota exceeded (HTTP 429) detected in Strix log")
                                    await log_both(
                                        "INFO",
                                        "Gemini cooldown activated. Switch provider mode to OLLAMA or wait for quota reset.",
                                        source="runner",
                                    )
                            elif "NotFoundError" in content or "not found" in content:
                                await log_both(
                                    "ERROR",
                                    "Strix error: Model endpoint or resource not found. Check model configuration.",
                                    source="strix",
                                )
            except Exception as log_err:
                logger.debug(f"Could not inspect strix.log for error details: {log_err}")

    except asyncio.CancelledError:
        final_status = "Cancelled"
        if scan_id in ACTIVE_PROCESSES:
            proc = ACTIVE_PROCESSES[scan_id]
            try:
                proc.terminate()
            except Exception:
                pass
        await log_both("WARNING", "Scan task was cancelled.", source="runner")
    except Exception as exc:
        final_status = "Failed"
        exit_code = 1
        logger.exception(f"Subprocess runner error in scan {scan_id}")
        await log_both("ERROR", f"Subprocess runner error: {repr(exc)}", source="runner")
    finally:
        ACTIVE_PROCESSES.pop(scan_id, None)
        if on_complete_callback:
            await on_complete_callback(scan_id, exit_code, strix_run_name, final_status, active_provider)


def cancel_active_scan(scan_id: str) -> bool:
    """
    Terminates an ongoing Strix scan process safely.
    """
    proc = ACTIVE_PROCESSES.get(scan_id)
    if proc and proc.poll() is None:
        try:
            logger.info(f"Terminating active Strix process for scan {scan_id}")
            proc.terminate()
            try:
                proc.wait(timeout=2.0)
            except subprocess.TimeoutExpired:
                proc.kill()
            ACTIVE_PROCESSES.pop(scan_id, None)
            return True
        except Exception as exc:
            logger.error(f"Failed to terminate process for scan {scan_id}: {exc}")
            try:
                proc.kill()
            except Exception:
                pass
            ACTIVE_PROCESSES.pop(scan_id, None)
            return True
    return False
