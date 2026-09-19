import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Shield,
} from 'lucide-react';
import { Finding, SeverityLevel, FindingStatus } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  initialScanId?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const Findings: React.FC<Props> = ({ initialScanId, onNavigate }) => {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const loadFindings = async () => {
    try {
      setLoading(true);
      const data = await api.listFindings({
        scan_id: initialScanId,
        severity: selectedSeverity || undefined,
        status_filter: selectedStatus || undefined,
        category: selectedCategory || undefined,
        search: search.trim() || undefined,
      });
      setFindings(data);
    } catch (err) {
      console.error('Error loading findings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFindings();
  }, [initialScanId, selectedSeverity, selectedStatus, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadFindings();
  };

  const categories = Array.from(new Set(findings.map((f) => f.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            Security Findings Repository
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {initialScanId ? `Showing findings for scan ${initialScanId.slice(0, 8)}` : 'All discovered vulnerabilities across authorized assessments.'}
          </p>
        </div>

        <div className="text-xs text-gray-400 bg-[#161f30] px-3 py-1.5 rounded-lg border border-[#233047]">
          Showing <span className="text-gray-100 font-semibold">{findings.length}</span> finding(s)
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-xl flex flex-wrap gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search findings by title, location, or description..."
            className="w-full bg-[#151c2a] border border-[#222c3d] rounded-lg pl-9 pr-3.5 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex flex-wrap gap-2.5">
          {/* Severity filter */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#151c2a] border border-[#222c3d] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Severities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
            <option value="Informational">Informational</option>
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#151c2a] border border-[#222c3d] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Fixed">Fixed</option>
            <option value="Accepted Risk">Accepted Risk</option>
            <option value="Retest Required">Retest Required</option>
          </select>

          {/* Category filter */}
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-[#151c2a] border border-[#222c3d] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={loadFindings}
            className="px-3 py-1.5 bg-[#1f293d] hover:bg-[#2b3852] text-xs font-medium text-gray-200 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Findings Table */}
      <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0e1320] text-gray-400 border-b border-[#1d273a]">
              <tr>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Affected Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Detected</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1d273a] text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    Loading findings...
                  </td>
                </tr>
              ) : findings.length > 0 ? (
                findings.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => onNavigate(`findings/${f.id}`)}
                    className="hover:bg-[#151c2d] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 px-4">
                      <SeverityBadge severity={f.severity} size="sm" />
                    </td>
                    <td className="py-3 px-4 font-semibold text-gray-100 max-w-sm truncate group-hover:text-blue-400 transition-colors">
                      {f.title}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{f.category}</td>
                    <td className="py-3 px-4 font-mono text-gray-400 max-w-xs truncate" title={f.location || ''}>
                      {f.location || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(f.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center text-blue-400 group-hover:translate-x-0.5 transition-transform font-medium">
                        Inspect <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    No vulnerability findings match your filters.
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
