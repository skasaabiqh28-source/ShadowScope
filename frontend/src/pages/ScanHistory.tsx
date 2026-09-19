import React, { useEffect, useState } from 'react';
import {
  History,
  AlertTriangle,
  FileText,
  GitCompare,
  ExternalLink,
  Clock,
  Trash2,
  Play,
} from 'lucide-react';
import { Scan } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/StatusBadge';
import { SkeletonTable } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';
import { ConfirmModal } from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const ScanHistory: React.FC<Props> = ({ onNavigate }) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const toast = useToast();

  const loadScans = async () => {
    try {
      setLoading(true);
      const data = await api.listScans();
      setScans(data);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load scan history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScans();
  }, []);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.deleteScan(deleteTarget.id);
      setScans((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast.success(`Scan '${deleteTarget.name}' deleted successfully.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete scan.');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-400" />
            Security Scan History
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Complete historical audit trail of authorized Strix scans and assessments.
          </p>
        </div>

        <button
          onClick={() => onNavigate('compare')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#1a2233] hover:bg-[#232e44] border border-[#2b3952] text-gray-200 text-xs font-medium rounded-lg transition-colors"
        >
          <GitCompare className="w-4 h-4 text-purple-400" />
          Compare Scans
        </button>
      </div>

      {/* Scans Table */}
      <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden shadow-lg">
        {loading ? (
          <SkeletonTable rows={5} columns={7} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs" aria-label="Security Scan History">
              <thead className="bg-[#0e1320] text-gray-400 border-b border-[#1d273a]">
                <tr>
                  <th scope="col" className="py-3 px-4">Run / Target</th>
                  <th scope="col" className="py-3 px-4">Mode</th>
                  <th scope="col" className="py-3 px-4">Status</th>
                  <th scope="col" className="py-3 px-4">Findings Breakdown</th>
                  <th scope="col" className="py-3 px-4">Duration</th>
                  <th scope="col" className="py-3 px-4">Date</th>
                  <th scope="col" className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d273a] text-gray-300">
                {scans.length > 0 ? (
                  scans.map((s) => (
                    <tr key={s.id} className="hover:bg-[#151c2d] transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-100">
                          {s.strix_run_name || `Scan ${s.id.slice(0, 8)}`}
                        </div>
                        <div className="font-mono text-[11px] text-gray-400 truncate max-w-xs" title={s.target_value}>
                          {s.target_value}
                        </div>
                      </td>
                      <td className="py-3 px-4 uppercase text-[11px] font-medium text-gray-400">
                        {s.scan_mode}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={s.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-200 mr-1">{s.findings_count}</span>
                          {s.critical_count > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-950 text-red-400 font-bold">
                              {s.critical_count}C
                            </span>
                          )}
                          {s.high_count > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-orange-950 text-orange-400 font-bold">
                              {s.high_count}H
                            </span>
                          )}
                          {s.medium_count > 0 && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-950 text-amber-400 font-bold">
                              {s.medium_count}M
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-400">
                        {formatElapsed(s.elapsed_seconds)}
                      </td>
                      <td className="py-3 px-4 text-gray-400">
                        {s.start_time ? new Date(s.start_time).toLocaleString() : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onNavigate(`scans/${s.id}`)}
                            className="px-2.5 py-1 rounded bg-[#182133] hover:bg-[#202c42] text-blue-400 font-medium focus-visible:ring-2 focus-visible:ring-blue-500"
                          >
                            Monitor
                          </button>
                          <button
                            onClick={() => onNavigate('reports', s.id)}
                            className="p-1 rounded text-gray-400 hover:text-gray-200 focus-visible:ring-2 focus-visible:ring-blue-500"
                            title="Generate Report"
                            aria-label={`Generate Report for scan ${s.strix_run_name || s.id.slice(0, 8)}`}
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTarget({
                                id: s.id,
                                name: s.strix_run_name || s.id.slice(0, 8),
                              })
                            }
                            className="p-1 rounded text-gray-500 hover:text-red-400 transition-colors focus-visible:ring-2 focus-visible:ring-red-500"
                            title="Delete Scan"
                            aria-label={`Delete scan ${s.strix_run_name || s.id.slice(0, 8)}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-4">
                      <EmptyState
                        icon={Play}
                        title="No Scans in Audit History"
                        description="Past penetration tests and assessments will be archived here with detailed findings breakdowns."
                        actionText="Start First Scan"
                        onAction={() => onNavigate('new-scan')}
                      />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Scan Deletion */}
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Delete Scan Record"
        message={`Are you sure you want to delete scan '${deleteTarget?.name}'? All associated findings, terminal logs, and generated reports will be permanently deleted.`}
        confirmText="Delete Permanently"
        isDanger={true}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
