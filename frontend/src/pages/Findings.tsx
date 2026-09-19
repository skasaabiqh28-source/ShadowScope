import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  RotateCcw,
  Terminal,
} from 'lucide-react';
import { Finding } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';
import { TerminalPane } from '../components/TerminalPane';
import { useToast } from '../context/ToastContext';

interface Props {
  initialScanId?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const Findings: React.FC<Props> = ({ initialScanId, onNavigate }) => {
  const { addToast } = useToast();
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
    } catch (err: any) {
      console.error('Error loading findings:', err);
      addToast(err.message || 'Failed to load security findings', 'error');
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

  const handleResetFilters = () => {
    setSearch('');
    setSelectedSeverity('');
    setSelectedStatus('');
    setSelectedCategory('');
  };

  const hasActiveFilters = Boolean(search || selectedSeverity || selectedStatus || selectedCategory);
  const categories = Array.from(new Set(findings.map((f) => f.category))).filter(Boolean);

  return (
    <div className="space-y-4 font-mono text-xs">
      {/* Header Pane */}
      <TerminalPane
        title="SECURITY_FINDINGS_LEDGER"
        prefix="VULNS"
        headerAction={
          <div className="text-[11px] text-[#33ff00]">
            RECORDS_MATCHED: [{findings.length}]
          </div>
        }
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <div className="text-[#33ff00] font-bold text-sm tracking-wider uppercase terminal-glow flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ffb000]" />
              CONFIRMED VULNERABILITIES & EXPLOIT PATHWAYS
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              {initialScanId ? `FILTERED: SCAN_UUID [${initialScanId.slice(0, 8)}]` : 'ALL CONFIRMED VULNERABILITIES ACROSS AUTHORIZED TARGETS.'}
            </p>
          </div>
        </div>
      </TerminalPane>

      {/* Filter Bar */}
      <TerminalPane title="FILTER_PARAMETERS" prefix="QUERY">
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[240px] flex items-center bg-black border border-[#1f521f] px-2 py-1">
            <span className="text-[#1f521f] mr-2 font-bold">&gt;</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH_BY_TITLE_OR_PATH..."
              className="w-full bg-transparent text-[#33ff00] font-mono text-xs focus:outline-none placeholder:text-[#1f521f]"
            />
          </form>

          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-black text-[#33ff00] border border-[#1f521f] px-2 py-1 text-xs uppercase font-mono focus:outline-none focus:border-[#33ff00]"
            >
              <option value="">ALL_SEVERITIES</option>
              <option value="Critical">CRITICAL</option>
              <option value="High">HIGH</option>
              <option value="Medium">MEDIUM</option>
              <option value="Low">LOW</option>
              <option value="Informational">INFORMATIONAL</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-black text-[#33ff00] border border-[#1f521f] px-2 py-1 text-xs uppercase font-mono focus:outline-none focus:border-[#33ff00]"
            >
              <option value="">ALL_STATUSES</option>
              <option value="Open">OPEN</option>
              <option value="Confirmed">CONFIRMED</option>
              <option value="Fixed">FIXED</option>
              <option value="Accepted Risk">ACCEPTED_RISK</option>
              <option value="Retest Required">RETEST_REQUIRED</option>
            </select>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-black text-[#33ff00] border border-[#1f521f] px-2 py-1 text-xs uppercase font-mono focus:outline-none focus:border-[#33ff00]"
              >
                <option value="">ALL_CATEGORIES</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.toUpperCase()}
                  </option>
                ))}
              </select>
            )}

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-terminal-amber py-1 px-2 text-[10px]"
              >
                [CLR_FILTERS]
              </button>
            )}

            <button
              onClick={loadFindings}
              className="btn-terminal py-1 px-2 text-[10px]"
            >
              [SYNC]
            </button>
          </div>
        </div>
      </TerminalPane>

      {/* Findings Table */}
      {loading ? (
        <TerminalPane title="DATA_FETCH" prefix="BUSY">
          <div className="py-8 text-center text-[#33ff00]">
            &gt; QUERYING_DATABASE_RECORDS...
          </div>
        </TerminalPane>
      ) : findings.length > 0 ? (
        <TerminalPane title="FINDINGS_TABLE" prefix="OUT">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-[#050c05] text-[#1f521f] border-b border-[#1f521f]">
                <tr>
                  <th className="py-2 px-3">SEVERITY</th>
                  <th className="py-2 px-3">ADVISORY_TITLE</th>
                  <th className="py-2 px-3">TARGET</th>
                  <th className="py-2 px-3">CATEGORY</th>
                  <th className="py-2 px-3">LOCATION</th>
                  <th className="py-2 px-3">STATUS</th>
                  <th className="py-2 px-3">DETECTED</th>
                  <th className="py-2 px-3 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1f521f]/50">
                {findings.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => onNavigate(`findings/${f.id}`)}
                    className="hover:bg-[#0d220d]/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2 px-3">
                      <SeverityBadge severity={f.severity} size="sm" />
                    </td>
                    <td className="py-2 px-3 font-bold text-[#33ff00] max-w-sm truncate group-hover:underline">
                      {f.title}
                    </td>
                    <td className="py-2 px-3 text-[#94a3b8] max-w-[180px] truncate" title={f.target || f.scan_id}>
                      {f.target || f.scan_id.slice(0, 8)}
                    </td>
                    <td className="py-2 px-3 text-[#1f521f]">{f.category}</td>
                    <td className="py-2 px-3 text-[#94a3b8] max-w-xs truncate" title={f.location || ''}>
                      {f.location || '—'}
                    </td>
                    <td className="py-2 px-3">
                      <StatusBadge status={f.status} />
                    </td>
                    <td className="py-2 px-3 text-[#1f521f] text-[11px]">
                      {new Date(f.created_at).toISOString().split('T')[0]}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <span className="text-[#33ff00] font-bold group-hover:bg-[#33ff00] group-hover:text-black px-1">
                        [INSPECT &gt;]
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TerminalPane>
      ) : hasActiveFilters ? (
        <EmptyState
          title="ZERO_FILTER_MATCHES"
          description="No security records matched active filter parameters."
          actionText="CLEAR_FILTERS"
          onAction={handleResetFilters}
        />
      ) : (
        <EmptyState
          title="ZERO_FINDINGS_RECORDED"
          description="System vulnerability database is clean. Launch an automated scan to inspect target surface."
          actionText="INITIATE_SCAN"
          onAction={() => onNavigate('new-scan')}
        />
      )}
    </div>
  );
};

export default Findings;
