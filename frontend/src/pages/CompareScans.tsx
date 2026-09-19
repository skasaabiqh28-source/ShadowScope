import React, { useEffect, useState } from 'react';
import {
  GitCompare,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ArrowRight,
  Shield,
} from 'lucide-react';
import { Scan, Finding } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/EmptyState';

interface Props {
  onNavigate?: (route: string, param?: string) => void;
}

export const CompareScans: React.FC<Props> = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [scans, setScans] = useState<Scan[]>([]);
  const [scan1Id, setScan1Id] = useState<string>('');
  const [scan2Id, setScan2Id] = useState<string>('');
  const [diffResult, setDiffResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setInitialLoading(true);
        const list = await api.listScans();
        setScans(list);
        if (list.length >= 2) {
          setScan1Id(list[1].id);
          setScan2Id(list[0].id);
        } else if (list.length === 1) {
          setScan1Id(list[0].id);
          setScan2Id(list[0].id);
        }
      } catch (err: any) {
        console.error('Failed to load scans:', err);
        addToast(err.message || 'Failed to load scans', 'error');
      } finally {
        setInitialLoading(false);
      }
    };
    load();
  }, []);

  const handleCompare = async () => {
    if (!scan1Id || !scan2Id) {
      addToast('Please select two scans to compare.', 'warning');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await api.compareScans(scan1Id, scan2Id);
      setDiffResult(res);
      addToast('Scan comparison completed successfully', 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to compare scans.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!initialLoading && scans.length < 2) {
    return (
      <div className="space-y-6">
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-purple-400" />
            Scan Comparison & Differential Analysis
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Compare two security scans to evaluate newly discovered, resolved, and persistent vulnerabilities.
          </p>
        </div>
        <EmptyState
          icon={GitCompare}
          title="At Least Two Scans Required"
          description="Differential analysis requires a minimum of two completed scans to evaluate vulnerability delta, fix regressions, and identify newly introduced issues."
          actionLabel="Launch a New Scan"
          onAction={() => onNavigate && onNavigate('new-scan')}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-purple-400" />
          Scan Comparison & Differential Analysis
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Compare two security scans to evaluate newly discovered, resolved, and persistent vulnerabilities.
        </p>
      </div>

      {/* Selectors Card */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="baseline-scan-select" className="text-xs text-gray-400 block mb-1 font-medium">
              Baseline Scan (Scan 1)
            </label>
            <select
              id="baseline-scan-select"
              value={scan1Id}
              onChange={(e) => setScan1Id(e.target.value)}
              className="w-full bg-[#151c2a] border border-[#222c3d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.strix_run_name || s.id.slice(0, 8)} — {s.target_value} ({s.start_time ? new Date(s.start_time).toLocaleDateString() : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="comparison-target-select" className="text-xs text-gray-400 block mb-1 font-medium">
              Comparison Target (Scan 2)
            </label>
            <select
              id="comparison-target-select"
              value={scan2Id}
              onChange={(e) => setScan2Id(e.target.value)}
              className="w-full bg-[#151c2a] border border-[#222c3d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.strix_run_name || s.id.slice(0, 8)} — {s.target_value} ({s.start_time ? new Date(s.start_time).toLocaleDateString() : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleCompare}
            disabled={loading || !scan1Id || !scan2Id}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <GitCompare className="w-4 h-4" />}
            Execute Comparison
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Comparison Results */}
      {diffResult && (
        <div className="space-y-6">
          {/* KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111726] border border-emerald-900/40 bg-emerald-950/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Resolved Findings
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {diffResult.metrics.resolved_count}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Fixed since Baseline</div>
            </div>

            <div className="bg-[#111726] border border-red-900/40 bg-red-950/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">
                New Findings
              </div>
              <div className="text-2xl font-bold text-red-400 mt-1">
                {diffResult.metrics.new_count}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Introduced in Target</div>
            </div>

            <div className="bg-[#111726] border border-amber-900/40 bg-amber-950/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Still Present
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {diffResult.metrics.persistent_count}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Unresolved findings</div>
            </div>

            <div className="bg-[#111726] border border-purple-900/40 bg-purple-950/10 p-4 rounded-xl">
              <div className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                Severity Changes
              </div>
              <div className="text-2xl font-bold text-purple-400 mt-1">
                {diffResult.metrics.severity_changed_count}
              </div>
              <div className="text-[11px] text-gray-500 mt-1">Re-calibrated severities</div>
            </div>
          </div>

          {/* New Findings List */}
          {diffResult.new.length > 0 && (
            <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Newly Introduced Findings ({diffResult.new.length})
              </h3>
              <div className="space-y-2">
                {diffResult.new.map((f: Finding) => (
                  <div key={f.id} className="p-3 bg-[#0e1320] border border-[#1d273a] rounded-lg text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-200">{f.title}</div>
                      <div className="text-gray-400 font-mono text-[11px]">{f.location || 'N/A'}</div>
                    </div>
                    <SeverityBadge severity={f.severity} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Still Present / Persistent Findings List */}
          {diffResult.persistent && diffResult.persistent.length > 0 && (
            <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Still Present / Persistent Findings ({diffResult.persistent.length})
              </h3>
              <div className="space-y-2">
                {diffResult.persistent.map((f: Finding) => (
                  <div key={f.id} className="p-3 bg-[#0e1320] border border-[#1d273a] rounded-lg text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-200">{f.title}</div>
                      <div className="text-gray-400 font-mono text-[11px]">{f.location || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={f.severity} size="sm" />
                      <span className="text-[11px] text-amber-400 font-medium">Unresolved</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Severity Changed Findings List */}
          {diffResult.severity_changed && diffResult.severity_changed.length > 0 && (
            <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-3">
              <h3 className="text-sm font-semibold text-purple-400 flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                Severity Re-calibrated ({diffResult.severity_changed.length})
              </h3>
              <div className="space-y-2">
                {diffResult.severity_changed.map((item: any, idx: number) => (
                  <div key={idx} className="p-3 bg-[#0e1320] border border-[#1d273a] rounded-lg text-xs flex justify-between items-center">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-200">{item.finding?.title || item.title}</div>
                      <div className="text-gray-400 font-mono text-[11px]">{item.finding?.location || 'N/A'}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <SeverityBadge severity={item.previous_severity} size="sm" />
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <SeverityBadge severity={item.current_severity} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
