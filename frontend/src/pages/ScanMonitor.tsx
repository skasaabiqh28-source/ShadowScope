import React, { useEffect, useState, useRef } from 'react';
import {
  Terminal,
  AlertTriangle,
  StopCircle,
  Copy,
  Check,
  Clock,
  Cpu,
  FileText,
  ArrowLeft,
} from 'lucide-react';
import { Scan, ScanLog } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { useToast } from '../context/ToastContext';
import { ConfirmModal } from '../components/ConfirmModal';
import { TerminalPane } from '../components/TerminalPane';
import { EmptyState } from '../components/EmptyState';

interface Props {
  scanId: string;
  onNavigate: (route: string, param?: string) => void;
}

export const ScanMonitor: React.FC<Props> = ({ scanId, onNavigate }) => {
  const { addToast } = useToast();
  const [scan, setScan] = useState<Scan | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchScan = async () => {
    try {
      const s = await api.getScan(scanId);
      setScan(s);
      const l = await api.getScanLogs(scanId);
      setLogs(l);
    } catch (err: any) {
      console.error('Error fetching scan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
    const interval = setInterval(() => {
      if (!scan || scan.status === 'Running' || scan.status === 'Starting') {
        fetchScan();
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [scanId, scan?.status]);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleConfirmCancel = async () => {
    setShowCancelModal(false);
    try {
      setCancelling(true);
      await api.cancelScan(scanId);
      addToast('[SYS_SIGINT] Scan cancellation sent to Strix daemon.', 'info');
      await fetchScan();
    } catch (err: any) {
      addToast(err.message || 'Failed to abort scan.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    addToast('[BUFFER_COPIED] Terminal logs copied to clipboard.', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !scan) {
    return (
      <div className="space-y-4 font-mono text-xs">
        <TerminalPane title="STREAM_INIT" prefix="TTY">
          <div className="flex items-center justify-center py-12 text-[#33ff00]">
            <span className="animate-pulse">&gt; CONNECTING_TO_STRIX_SUBPROCESS_STREAM...</span>
            <span className="cursor-block ml-2" />
          </div>
        </TerminalPane>
      </div>
    );
  }

  if (!scan) {
    return (
      <EmptyState
        title="SCAN_NOT_FOUND"
        description="The requested scan ID does not exist in local database or was removed."
        actionLabel="ALL_SCANS"
        onAction={() => onNavigate('scans')}
      />
    );
  }

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isRunning = scan.status === 'Running' || scan.status === 'Starting';

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Return button */}
      <div>
        <button
          onClick={() => onNavigate('history')}
          className="text-[#94a3b8] hover:text-[#33ff00] text-xs transition-colors"
        >
          &lt;-- [RETURN_TO_SCAN_HISTORY]
        </button>
      </div>

      {/* Main Status Header Pane */}
      <TerminalPane
        title={`SESSION: ${scan.strix_run_name || scan.id.slice(0, 8)}`}
        prefix="MONITOR"
        badge={<StatusBadge status={scan.status} />}
        headerAction={
          <div className="flex items-center space-x-2">
            {isRunning && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                className="btn-terminal-danger text-[10px] py-0.5 px-2"
              >
                [X ABORT_SCAN]
              </button>
            )}

            {scan.findings_count > 0 && (
              <button
                onClick={() => onNavigate('findings', scan.id)}
                className="btn-terminal-amber text-[10px] py-0.5 px-2 font-bold"
              >
                [? FINDINGS: {scan.findings_count}]
              </button>
            )}

            <button
              onClick={() => onNavigate('reports', scan.id)}
              className="btn-terminal text-[10px] py-0.5 px-2"
            >
              [# AUDIT_REPORT]
            </button>
          </div>
        }
      >
        <div className="space-y-1">
          <div className="text-[#33ff00] font-bold text-xs truncate">
            TARGET_URI: <span className="text-[#94a3b8] font-normal">{scan.target_value}</span>
          </div>
          <div className="text-[10px] text-[#1f521f]">
            VECTOR_TYPE: [{scan.target_type}] // RUN_UUID: [{scan.id}]
          </div>
        </div>
      </TerminalPane>

      {/* Telemetry Metric Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="border border-[#1f521f] bg-black p-3">
          <div className="text-[10px] text-[#94a3b8] uppercase">ELAPSED_CLOCK</div>
          <div className="text-lg font-bold text-[#33ff00] mt-1 flex items-center space-x-1.5 terminal-glow">
            <Clock className="w-3.5 h-3.5 text-[#33ff00]" />
            <span>{formatElapsed(scan.elapsed_seconds)}</span>
          </div>
        </div>

        <div className="border border-[#1f521f] bg-black p-3">
          <div className="text-[10px] text-[#94a3b8] uppercase">ASSESSMENT_MODE</div>
          <div className="text-lg font-bold uppercase text-[#33ff00] mt-1">
            [{scan.scan_mode}]
          </div>
        </div>

        <div className="border border-[#1f521f] bg-black p-3">
          <div className="text-[10px] text-[#94a3b8] uppercase">ACTIVE_LLM</div>
          <div className="text-lg font-bold text-[#ffb000] mt-1 amber-glow flex items-center space-x-1.5">
            <Cpu className="w-3.5 h-3.5 text-[#ffb000]" />
            <span>{scan.provider_used}</span>
          </div>
        </div>

        <div className={`border p-3 bg-black ${scan.findings_count > 0 ? 'border-[#ff3333]' : 'border-[#1f521f]'}`}>
          <div className="text-[10px] text-[#94a3b8] uppercase">CONFIRMED_FINDINGS</div>
          <div className={`text-lg font-bold mt-1 ${scan.findings_count > 0 ? 'text-[#ff3333] error-glow' : 'text-[#33ff00]'}`}>
            [{scan.findings_count}]
          </div>
        </div>
      </div>

      {/* Terminal Live Stream Window */}
      <TerminalPane
        title="STRIX_SUBPROCESS_TTY"
        prefix="STDOUT"
        glow={isRunning}
        headerAction={
          <div className="flex items-center space-x-3 text-[11px]">
            <label className="flex items-center space-x-1.5 cursor-pointer text-[#94a3b8] hover:text-[#33ff00]">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="accent-[#33ff00]"
              />
              <span className="uppercase text-[10px]">[AUTO_SCROLL]</span>
            </label>

            <button
              onClick={handleCopyLogs}
              className="btn-terminal text-[10px] py-0.5 px-2"
            >
              {copied ? '[COPIED]' : '[COPY_BUFFER]'}
            </button>
          </div>
        }
      >
        <div
          role="region"
          aria-label="Terminal stdout stream"
          className="h-[480px] overflow-y-auto font-mono text-xs select-text space-y-0.5 pr-2 bg-black"
        >
          {logs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="text-[#33ff00] font-bold terminal-glow">
                :: STRIX SECURITY ENGINE INITIATING ::
              </div>
              <div className="text-[#1f521f] text-xs">
                $ strix --target &quot;{scan.target_value}&quot; --scan-mode {scan.scan_mode} --non-interactive
              </div>
              <div className="text-[#94a3b8] text-[11px] pt-2 flex items-center justify-center space-x-2">
                <span className="w-1.5 h-1.5 bg-[#33ff00] animate-ping" />
                <span>SPAWNING SUBPROCESS IN DOCKER SANDBOX...</span>
              </div>
            </div>
          ) : (
            logs.map((log) => {
              const msg = log.message;
              const isBorder = msg.startsWith('+-') || msg.startsWith('|') || msg.startsWith('+---') || msg.startsWith('┌') || msg.startsWith('└') || msg.startsWith('│');
              const isWarning = log.level === 'WARNING' || msg.includes('WARNING') || msg.includes('WARN');
              const isError = log.level === 'ERROR' || msg.toLowerCase().includes('error:') || msg.toLowerCase().includes('traceback') || msg.toLowerCase().includes('failed');
              const isSuccess = msg.toLowerCase().includes('completed successfully') || msg.toLowerCase().includes('succeeded') || msg.includes('Penetration test completed');

              let lineClass = 'text-[#33ff00]';
              if (isError) lineClass = 'text-[#ff3333] font-bold error-glow';
              else if (isWarning) lineClass = 'text-[#ffb000] font-bold amber-glow';
              else if (isSuccess) lineClass = 'text-[#33ff00] font-bold terminal-glow';
              else if (isBorder) lineClass = 'text-[#1f521f] font-mono select-none';

              const timeStr = log.timestamp.split('T')[1]?.slice(0, 8) || '';

              return (
                <div
                  key={log.id}
                  className="leading-snug hover:bg-[#0d220d]/60 px-1 py-0.2 flex space-x-2 font-mono whitespace-pre-wrap break-all"
                >
                  <span className="text-[#1f521f] select-none shrink-0 text-[10px]">
                    {timeStr}
                  </span>
                  <span className={`${lineClass} flex-1`}>{msg}</span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </TerminalPane>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        title="TERMINATE_STRIX_PROCESS"
        message="Terminate active penetration test? Subprocess will receive SIGINT and partial telemetry will be saved."
        confirmText="TERMINATE"
        cancelText="ABORT"
        isDanger={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
};

export default ScanMonitor;
