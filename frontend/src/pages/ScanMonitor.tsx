import React, { useEffect, useState, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  StopCircle,
  Copy,
  Check,
  Clock,
  Cpu,
  Layers,
  FileText,
  Terminal,
} from 'lucide-react';
import { Scan, ScanLog } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  scanId: string;
  onNavigate: (route: string, param?: string) => void;
}

export const ScanMonitor: React.FC<Props> = ({ scanId, onNavigate }) => {
  const [scan, setScan] = useState<Scan | null>(null);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchScan = async () => {
    try {
      const s = await api.getScan(scanId);
      setScan(s);
      const l = await api.getScanLogs(scanId);
      setLogs(l);
    } catch (err) {
      console.error('Error fetching scan data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScan();
    // Poll every 2.5 seconds while active
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

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to stop this Strix scan?')) return;
    try {
      setCancelling(true);
      await api.cancelScan(scanId);
      await fetchScan();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel scan');
    } finally {
      setCancelling(false);
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.timestamp}] [${l.level}] ${l.message}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && !scan) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <Activity className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        <span>Loading scan telemetry...</span>
      </div>
    );
  }

  if (!scan) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300">
        Scan not found.
      </div>
    );
  }

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const isRunning = scan.status === 'Running' || scan.status === 'Starting';

  return (
    <div className="space-y-6">
      {/* Scan Summary Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-100">
              Scan: {scan.strix_run_name || scan.id.slice(0, 8)}
            </h2>
            <StatusBadge status={scan.status} />
          </div>
          <div className="text-xs font-mono text-gray-400 mt-1 max-w-xl truncate">
            Target: <span className="text-blue-400">{scan.target_value}</span> ({scan.target_type})
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isRunning && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/80 border border-red-800/60 text-red-300 text-xs font-medium transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              {cancelling ? 'Stopping...' : 'Cancel Scan'}
            </button>
          )}

          {scan.findings_count > 0 && (
            <button
              onClick={() => onNavigate('findings', scan.id)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-600/20"
            >
              <AlertTriangle className="w-4 h-4" />
              View Findings ({scan.findings_count})
            </button>
          )}

          <button
            onClick={() => onNavigate('reports', scan.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1a2233] hover:bg-[#232e44] border border-[#2b3952] text-gray-200 text-xs font-medium transition-colors"
          >
            <FileText className="w-4 h-4 text-gray-400" />
            Generate Report
          </button>
        </div>
      </div>

      {/* Meta Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Elapsed Time</div>
          <div className="text-xl font-bold font-mono text-gray-100 mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-blue-400" />
            {formatElapsed(scan.elapsed_seconds)}
          </div>
        </div>

        <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Scan Mode</div>
          <div className="text-xl font-bold uppercase text-blue-400 mt-1">{scan.scan_mode}</div>
        </div>

        <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
          <div className="text-xs text-gray-400 uppercase tracking-wider">LLM Provider</div>
          <div className="text-xl font-bold font-mono text-purple-400 mt-1 flex items-center gap-1.5">
            <Cpu className="w-4 h-4" />
            {scan.provider_used}
          </div>
        </div>

        <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
          <div className="text-xs text-gray-400 uppercase tracking-wider">Findings Total</div>
          <div className="text-xl font-bold text-gray-100 mt-1">{scan.findings_count}</div>
        </div>
      </div>

      {/* Live Log Stream Viewer */}
      <div className="bg-[#0b0e14] border border-[#1d273a] rounded-xl overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="bg-[#0f1420] px-4 py-2.5 border-b border-[#1d273a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-mono text-gray-300 font-semibold">
              Live Strix Subprocess Log Output
            </span>
            {isRunning && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-sans ml-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Live Stream
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 text-xs text-gray-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 bg-gray-800 border-gray-700"
              />
              Auto-scroll
            </label>

            <button
              onClick={handleCopyLogs}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2 py-1 rounded bg-[#161e2e] border border-[#232f44] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        <div className="p-4 h-[450px] overflow-y-auto font-mono text-xs text-gray-300 space-y-1 bg-[#090c12]">
          {logs.length === 0 ? (
            <div className="text-gray-500 italic py-8 text-center">
              Waiting for Strix output stream...
            </div>
          ) : (
            logs.map((log) => {
              let color = 'text-gray-300';
              if (log.level === 'ERROR') color = 'text-red-400';
              else if (log.level === 'WARNING') color = 'text-amber-400';
              else if (log.source === 'runner') color = 'text-blue-300';

              const timeStr = log.timestamp.split('T')[1]?.slice(0, 8) || '';

              return (
                <div key={log.id} className="leading-relaxed hover:bg-[#111726]/60 px-1 rounded flex gap-2">
                  <span className="text-gray-600 select-none shrink-0">{timeStr}</span>
                  <span
                    className={`shrink-0 text-[10px] font-bold px-1 rounded select-none ${
                      log.level === 'ERROR'
                        ? 'bg-red-950 text-red-400'
                        : log.level === 'WARNING'
                        ? 'bg-amber-950 text-amber-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {log.level}
                  </span>
                  <span className={`${color} break-all`}>{log.message}</span>
                </div>
              );
            })
          )}
          <div ref={logEndRef} />
        </div>
      </div>
    </div>
  );
};
