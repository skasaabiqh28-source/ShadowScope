import React, { useEffect, useState } from 'react';
import {
  Terminal,
  Play,
  History,
  AlertTriangle,
  Cpu,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { DashboardMetrics } from '../types';
import { api } from '../services/api';
import { TerminalPane } from '../components/TerminalPane';
import { AsciiBar } from '../components/AsciiBar';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardMetrics();
      setMetrics(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="space-y-4 font-mono text-xs text-[#33ff00]">
        <TerminalPane title="SYS_INIT" prefix="BOOT">
          <div className="flex items-center space-x-2 py-8 justify-center">
            <span className="text-[#33ff00] animate-pulse">&gt; QUERYING_STRIX_TELEMETRY...</span>
            <span className="cursor-block" />
          </div>
        </TerminalPane>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <TerminalPane title="COMM_FAILURE" error={true} prefix="ERR">
        <div className="p-4 text-center space-y-3">
          <div className="text-[#ff3333] font-bold text-sm tracking-wider uppercase">
            [!] CONNECTION_FAILED: CANNOT_REACH_BACKEND_DAEMON
          </div>
          <p className="text-xs text-[#94a3b8] max-w-md mx-auto">{error}</p>
          <button
            onClick={loadData}
            className="btn-terminal-danger mt-2"
          >
            [ RETRY_HANDSHAKE ]
          </button>
        </div>
      </TerminalPane>
    );
  }

  const totalFindings = metrics?.open_findings || 0;
  const maxFindings = Math.max(
    totalFindings,
    metrics?.critical_findings || 0,
    metrics?.high_findings || 0,
    metrics?.medium_findings || 0,
    1
  );

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Top Banner Pane */}
      <TerminalPane
        title="SYSTEM_OVERVIEW"
        prefix="ROOT"
        headerAction={
          <button
            onClick={loadData}
            title="Refresh metrics"
            className="text-[#1f521f] hover:text-[#33ff00] transition-colors"
          >
            [&circlearrowright; SYNC]
          </button>
        }
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="text-[#33ff00] font-bold text-sm tracking-wider uppercase terminal-glow flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#33ff00]" />
              SHADOWSCOPE // STRIX TELEMETRY CONSOLE
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-1">
              Autonomous penetration testing, vulnerability correlation, and AI-assisted remediations.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onNavigate('new-scan')}
              className="btn-terminal font-bold"
            >
              [+ INITIATE_SCAN]
            </button>
            <button
              onClick={() => onNavigate('findings')}
              className="btn-terminal"
            >
              [? FINDINGS_LEDGER]
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="btn-terminal"
            >
              [# SCAN_HISTORY]
            </button>
          </div>
        </div>
      </TerminalPane>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {/* Total Scans */}
        <div className="border border-[#1f521f] bg-black p-3 select-none">
          <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">TOTAL_SCANS</div>
          <div className="text-xl font-bold text-[#33ff00] mt-1 terminal-glow">
            {metrics?.total_scans || 0}
          </div>
          <div className="text-[10px] text-[#1f521f] mt-1">
            [{metrics?.completed_scans || 0} COMPLETED]
          </div>
        </div>

        {/* Active Scans */}
        <div className={`border p-3 select-none bg-black ${
          (metrics?.active_scans || 0) > 0 ? 'border-[#33ff00] animate-pulse' : 'border-[#1f521f]'
        }`}>
          <div className="text-[10px] text-[#33ff00] uppercase tracking-wider">ACTIVE_SCANS</div>
          <div className="text-xl font-bold text-[#33ff00] mt-1 flex items-center gap-2">
            {metrics?.active_scans || 0}
            {(metrics?.active_scans || 0) > 0 && <span className="cursor-block" />}
          </div>
          <div className="text-[10px] text-[#1f521f] mt-1">[STRIX_EXEC]</div>
        </div>

        {/* Critical */}
        <div className="border border-[#ff3333] bg-black p-3 select-none">
          <div className="text-[10px] text-[#ff3333] uppercase tracking-wider">CRITICAL</div>
          <div className="text-xl font-bold text-[#ff3333] mt-1 error-glow">
            {metrics?.critical_findings || 0}
          </div>
          <div className="text-[10px] text-[#ff3333]/70 mt-1">[IMMEDIATE_ACTION]</div>
        </div>

        {/* High */}
        <div className="border border-[#ffb000] bg-black p-3 select-none">
          <div className="text-[10px] text-[#ffb000] uppercase tracking-wider">HIGH</div>
          <div className="text-xl font-bold text-[#ffb000] mt-1 amber-glow">
            {metrics?.high_findings || 0}
          </div>
          <div className="text-[10px] text-[#ffb000]/70 mt-1">[PRIORITY_PATCH]</div>
        </div>

        {/* Medium */}
        <div className="border border-[#ffb000]/60 bg-black p-3 select-none">
          <div className="text-[10px] text-[#ffb000] uppercase tracking-wider">MEDIUM</div>
          <div className="text-xl font-bold text-[#ffb000] mt-1">
            {metrics?.medium_findings || 0}
          </div>
          <div className="text-[10px] text-[#1f521f] mt-1">[MODERATE_RISK]</div>
        </div>

        {/* Low / Info */}
        <div className="border border-[#1f521f] bg-black p-3 select-none">
          <div className="text-[10px] text-[#94a3b8] uppercase tracking-wider">LOW / INFO</div>
          <div className="text-xl font-bold text-[#33ff00] mt-1">
            {(metrics?.low_findings || 0) + (metrics?.info_findings || 0)}
          </div>
          <div className="text-[10px] text-[#1f521f] mt-1">[HARDENING]</div>
        </div>
      </div>

      {/* Grid: Severity ASCII Breakdown & Engine Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Severity ASCII Distribution Pane */}
        <TerminalPane
          title="SEVERITY_DISTRIBUTION"
          prefix="DATA"
          className="lg:col-span-2"
          headerAction={
            <span className="text-[11px] text-[#94a3b8]">
              OPEN_FINDINGS: [{totalFindings}]
            </span>
          }
        >
          <div className="space-y-3 py-1">
            <AsciiBar
              label="CRITICAL"
              value={metrics?.critical_findings || 0}
              max={maxFindings}
              variant="red"
              showValue={true}
              length={24}
            />
            <AsciiBar
              label="HIGH"
              value={metrics?.high_findings || 0}
              max={maxFindings}
              variant="amber"
              showValue={true}
              length={24}
            />
            <AsciiBar
              label="MEDIUM"
              value={metrics?.medium_findings || 0}
              max={maxFindings}
              variant="amber"
              showValue={true}
              length={24}
            />
            <AsciiBar
              label="LOW"
              value={metrics?.low_findings || 0}
              max={maxFindings}
              variant="green"
              showValue={true}
              length={24}
            />
            <AsciiBar
              label="INFO"
              value={metrics?.info_findings || 0}
              max={maxFindings}
              variant="muted"
              showValue={true}
              length={24}
            />
          </div>
          <div className="mt-4 pt-2 border-t border-[#1f521f] text-[10px] text-[#1f521f] flex justify-between">
            <span>FORMAT: ASCII_METRIC_GAUGE</span>
            <span>RATIO: (COUNT / TOTAL_VULNS)</span>
          </div>
        </TerminalPane>

        {/* Engine Telemetry Pane */}
        <TerminalPane
          title="STRIX_CORE_TELEMETRY"
          prefix="SYS"
          footer={
            <button
              onClick={() => onNavigate('settings')}
              className="hover:text-[#33ff00] text-[#94a3b8] transition-colors"
            >
              &gt; GOTO_CONFIG_SETTINGS_
            </button>
          }
        >
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-[#1f521f]/50">
              <span className="text-[#94a3b8]">STRIX_VERSION:</span>
              <span className="text-[#33ff00] font-bold">1.6.2</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#1f521f]/50">
              <span className="text-[#94a3b8]">SANDBOX:</span>
              <span className={metrics?.docker_running ? 'text-[#33ff00] font-bold' : 'text-[#ffb000]'}>
                {metrics?.docker_running ? '[ACTIVE]' : '[STANDALONE]'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#1f521f]/50">
              <span className="text-[#94a3b8]">ACTIVE_LLM:</span>
              <span className="text-[#33ff00] font-bold">
                {metrics?.provider_status?.active_provider || 'GEMINI'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#1f521f]/50">
              <span className="text-[#94a3b8]">FAILOVER_MODE:</span>
              <span className="text-[#ffb000] font-bold">
                [{metrics?.provider_status?.mode || 'AUTO'}]
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#94a3b8]">LOCAL_FALLBACK:</span>
              <span className="text-[#94a3b8]">Ollama (llama3.2)</span>
            </div>
          </div>
        </TerminalPane>
      </div>

      {/* Recent Scans Pane */}
      <TerminalPane
        title="RECENT_EXECUTIONS"
        prefix="RUNS"
        headerAction={
          <button
            onClick={() => onNavigate('history')}
            className="text-[11px] text-[#33ff00] hover:underline"
          >
            [ALL_SCANS &rarr;]
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#050c05] text-[#1f521f] border-b border-[#1f521f]">
              <tr>
                <th className="py-2 px-3 font-bold">TARGET_URI_OR_PATH</th>
                <th className="py-2 px-3 font-bold">SCAN_MODE</th>
                <th className="py-2 px-3 font-bold">STATUS</th>
                <th className="py-2 px-3 font-bold">FINDINGS</th>
                <th className="py-2 px-3 font-bold">TIMESTAMP</th>
                <th className="py-2 px-3 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f521f]/50">
              {metrics?.recent_scans && metrics.recent_scans.length > 0 ? (
                metrics.recent_scans.map((s) => (
                  <tr key={s.id} className="hover:bg-[#0d220d]/50 transition-colors">
                    <td className="py-2 px-3 text-[#33ff00] max-w-xs truncate" title={s.target_value}>
                      {s.target_value}
                    </td>
                    <td className="py-2 px-3 uppercase text-[11px] text-[#94a3b8]">
                      [{s.scan_mode}]
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-2 px-3 font-bold text-[#33ff00]">
                      {s.findings_count}
                    </td>
                    <td className="py-2 px-3 text-[#94a3b8] text-[11px]">
                      {s.start_time ? new Date(s.start_time).toISOString().replace('T', ' ').substring(0, 16) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onNavigate(`scans/${s.id}`)}
                        className="btn-terminal text-[10px] py-0.5 px-2"
                      >
                        [MONITOR]
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4">
                    <EmptyState
                      title="NO_ACTIVE_SCANS_FOUND"
                      description="Initiate an automated penetration test against a local code repository or network target."
                      actionText="INITIATE_SCAN"
                      onAction={() => onNavigate('new-scan')}
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TerminalPane>

      {/* Recently Discovered Findings */}
      <TerminalPane
        title="VULNERABILITY_FEED"
        prefix="ALERT"
        headerAction={
          <button
            onClick={() => onNavigate('findings')}
            className="text-[11px] text-[#33ff00] hover:underline"
          >
            [FULL_LEDGER &rarr;]
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono" aria-label="Recent Vulnerabilities">
            <thead className="bg-[#050c05] text-[#1f521f] border-b border-[#1f521f]">
              <tr>
                <th className="py-2 px-3 font-bold">SEVERITY</th>
                <th className="py-2 px-3 font-bold">ADVISORY_TITLE</th>
                <th className="py-2 px-3 font-bold">CATEGORY</th>
                <th className="py-2 px-3 font-bold">LOCATION</th>
                <th className="py-2 px-3 font-bold">STATUS</th>
                <th className="py-2 px-3 font-bold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1f521f]/50">
              {metrics?.recent_findings && metrics.recent_findings.length > 0 ? (
                metrics.recent_findings.map((f) => (
                  <tr key={f.id} className="hover:bg-[#0d220d]/50 transition-colors">
                    <td className="py-2 px-3">
                      <SeverityBadge severity={f.severity} size="sm" />
                    </td>
                    <td className="py-2 px-3 text-[#33ff00] max-w-sm truncate" title={f.title}>
                      {f.title}
                    </td>
                    <td className="py-2 px-3 text-[#94a3b8] text-[11px]">{f.category}</td>
                    <td className="py-2 px-3 text-[#1f521f] text-[11px] max-w-xs truncate" title={f.location || ''}>
                      {f.location || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        onClick={() => onNavigate(`findings/${f.id}`)}
                        className="btn-terminal text-[10px] py-0.5 px-2"
                      >
                        [INSPECT]
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-4">
                    <EmptyState
                      title="ZERO_VULNERABILITIES_REPORTED"
                      description="No confirmed vulnerabilities recorded in system database. Run a scan to discover threats."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </TerminalPane>
    </div>
  );
};

export default Dashboard;
