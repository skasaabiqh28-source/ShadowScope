import React, { useEffect, useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Activity,
  Play,
  History,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { DashboardMetrics, Scan, Finding } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';

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
    const interval = setInterval(loadData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <Activity className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        <span>Loading security metrics...</span>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300">
        <div className="font-semibold mb-1">Failed to load dashboard</div>
        <div className="text-sm">{error}</div>
      </div>
    );
  }

  const chartData = [
    { name: 'Critical', count: metrics?.critical_findings || 0, color: '#ef4444' },
    { name: 'High', count: metrics?.high_findings || 0, color: '#f97316' },
    { name: 'Medium', count: metrics?.medium_findings || 0, color: '#eab308' },
    { name: 'Low', count: metrics?.low_findings || 0, color: '#3b82f6' },
    { name: 'Info', count: metrics?.info_findings || 0, color: '#64748b' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Security Overview
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time vulnerability metrics and Strix penetration testing engine status.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => onNavigate('new-scan')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20"
          >
            <Play className="w-4 h-4 fill-current" />
            New Security Scan
          </button>
          <button
            onClick={() => onNavigate('findings')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b2333] hover:bg-[#232d42] text-gray-200 text-sm font-medium rounded-lg border border-[#2d3a52] transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            View Findings
          </button>
          <button
            onClick={() => onNavigate('history')}
            className="flex items-center gap-2 px-4 py-2 bg-[#1b2333] hover:bg-[#232d42] text-gray-200 text-sm font-medium rounded-lg border border-[#2d3a52] transition-colors"
          >
            <History className="w-4 h-4 text-gray-400" />
            Scan History
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
          <div className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Scans</div>
          <div className="text-2xl font-bold text-gray-100 mt-2">{metrics?.total_scans || 0}</div>
          <div className="text-[11px] text-gray-500 mt-1">{metrics?.completed_scans || 0} completed</div>
        </div>

        <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
          <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">Active Scans</div>
          <div className="text-2xl font-bold text-blue-400 mt-2 flex items-center gap-2">
            {metrics?.active_scans || 0}
            {(metrics?.active_scans || 0) > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping" />
            )}
          </div>
          <div className="text-[11px] text-gray-500 mt-1">Strix executing</div>
        </div>

        <div className="bg-[#111726] border border-red-900/40 p-4 rounded-lg bg-red-950/10">
          <div className="text-xs font-medium text-red-400 uppercase tracking-wider">Critical</div>
          <div className="text-2xl font-bold text-red-400 mt-2">{metrics?.critical_findings || 0}</div>
          <div className="text-[11px] text-red-400/70 mt-1">Immediate action</div>
        </div>

        <div className="bg-[#111726] border border-orange-900/40 p-4 rounded-lg bg-orange-950/10">
          <div className="text-xs font-medium text-orange-400 uppercase tracking-wider">High</div>
          <div className="text-2xl font-bold text-orange-400 mt-2">{metrics?.high_findings || 0}</div>
          <div className="text-[11px] text-orange-400/70 mt-1">High priority</div>
        </div>

        <div className="bg-[#111726] border border-amber-900/40 p-4 rounded-lg bg-amber-950/10">
          <div className="text-xs font-medium text-amber-400 uppercase tracking-wider">Medium</div>
          <div className="text-2xl font-bold text-amber-400 mt-2">{metrics?.medium_findings || 0}</div>
          <div className="text-[11px] text-amber-400/70 mt-1">Moderate risk</div>
        </div>

        <div className="bg-[#111726] border border-blue-900/40 p-4 rounded-lg bg-blue-950/10">
          <div className="text-xs font-medium text-blue-400 uppercase tracking-wider">Low / Info</div>
          <div className="text-2xl font-bold text-blue-400 mt-2">
            {(metrics?.low_findings || 0) + (metrics?.info_findings || 0)}
          </div>
          <div className="text-[11px] text-blue-400/70 mt-1">Hardening advice</div>
        </div>
      </div>

      {/* Chart and System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Distribution Bar Chart */}
        <div className="lg:col-span-2 bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
          <h3 className="text-sm font-semibold text-gray-200 mb-4 flex items-center justify-between">
            <span>Severity Distribution</span>
            <span className="text-xs font-normal text-gray-400">Total Findings: {metrics?.open_findings || 0}</span>
          </h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0d121c', borderColor: '#2b3850', color: '#f3f4f6', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Engine & Provider Status Card */}
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Engine & AI Telemetry
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-[#1d273a]">
                <span className="text-gray-400">Strix CLI Version:</span>
                <span className="font-mono text-gray-200">1.6.2</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#1d273a]">
                <span className="text-gray-400">Docker Sandbox:</span>
                <span className={metrics?.docker_running ? 'text-emerald-400 font-medium' : 'text-red-400 font-medium'}>
                  {metrics?.docker_running ? 'Running' : 'Offline'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#1d273a]">
                <span className="text-gray-400">Primary Provider:</span>
                <span className="text-cyan-300 font-mono">Gemini (3.8-flash)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-[#1d273a]">
                <span className="text-gray-400">Fallback Provider:</span>
                <span className="text-purple-300 font-mono">Ollama (llama3.2)</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-gray-400">Failover Mode:</span>
                <span className="px-2 py-0.5 rounded text-[11px] bg-blue-950 text-blue-300 border border-blue-800">
                  {metrics?.provider_status?.mode || 'AUTO'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#1d273a]">
            <button
              onClick={() => onNavigate('settings')}
              className="w-full text-center text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Configure engine & providers &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Scans Table */}
      <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1d273a] flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-200">Recent Scans</h3>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            All scans <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1320] text-gray-400 border-b border-[#1d273a]">
              <tr>
                <th className="py-3 px-4">Target</th>
                <th className="py-3 px-4">Mode</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Findings</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d273a] text-gray-300">
              {metrics?.recent_scans && metrics.recent_scans.length > 0 ? (
                metrics.recent_scans.map((s) => (
                  <tr key={s.id} className="hover:bg-[#151c2d] transition-colors">
                    <td className="py-3 px-4 font-mono text-gray-200 max-w-xs truncate" title={s.target_value}>
                      {s.target_value}
                    </td>
                    <td className="py-3 px-4 uppercase text-[11px] font-medium text-gray-400">
                      {s.scan_mode}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-200">
                      {s.findings_count}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {s.start_time ? new Date(s.start_time).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate(`scans/${s.id}`)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Monitor / View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No scans recorded yet. Click "New Security Scan" to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recently Discovered Findings */}
      <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#1d273a] flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-200">Recently Discovered Findings</h3>
          <button
            onClick={() => onNavigate('findings')}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            All findings <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1320] text-gray-400 border-b border-[#1d273a]">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d273a] text-gray-300">
              {metrics?.recent_findings && metrics.recent_findings.length > 0 ? (
                metrics.recent_findings.map((f) => (
                  <tr key={f.id} className="hover:bg-[#151c2d] transition-colors">
                    <td className="py-3 px-4">
                      <SeverityBadge severity={f.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-100 max-w-sm truncate" title={f.title}>
                      {f.title}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{f.category}</td>
                    <td className="py-3 px-4 font-mono text-gray-400 max-w-xs truncate" title={f.location || ''}>
                      {f.location || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onNavigate(`findings/${f.id}`)}
                        className="text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gray-500">
                    No findings discovered yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
