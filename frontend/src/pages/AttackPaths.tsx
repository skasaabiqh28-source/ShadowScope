import React, { useEffect, useState } from 'react';
import {
  GitBranch,
  AlertCircle,
  Shield,
  Layers,
  Info,
  RefreshCw,
  Plus,
  ArrowRight,
  Server,
  Database,
  Globe,
  X,
} from 'lucide-react';
import { AttackPathGraph, Scan } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { EmptyState } from '../components/EmptyState';
import { SkeletonCard } from '../components/LoadingSkeleton';

interface Props {
  initialScanId?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const AttackPaths: React.FC<Props> = ({ initialScanId, onNavigate }) => {
  const { addToast } = useToast();
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>(initialScanId || '');
  const [graph, setGraph] = useState<AttackPathGraph | null>(null);
  const [loading, setLoading] = useState(true);

  // Manual relation modal state
  const [isRelateModalOpen, setIsRelateModalOpen] = useState(false);
  const [sourceNodeId, setSourceNodeId] = useState('');
  const [targetNodeId, setTargetNodeId] = useState('');
  const [relationType, setRelationType] = useState('chains_to');
  const [relationEvidence, setRelationEvidence] = useState('');
  const [creatingEdge, setCreatingEdge] = useState(false);

  // Load available scans
  useEffect(() => {
    const loadScans = async () => {
      try {
        const list = await api.listScans();
        setScans(list);
        if (!selectedScanId && list.length > 0) {
          setSelectedScanId(list[0].id);
        }
      } catch (err: any) {
        console.error('Error fetching scans for attack path:', err);
      }
    };
    loadScans();
  }, []);

  const loadGraph = async () => {
    if (!selectedScanId) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const g = await api.getAttackPathGraph(selectedScanId);
      setGraph(g);
      if (g.nodes.length >= 2) {
        setSourceNodeId(g.nodes[0].id);
        setTargetNodeId(g.nodes[1].id);
      } else if (g.nodes.length === 1) {
        setSourceNodeId(g.nodes[0].id);
      }
    } catch (err: any) {
      console.error('Error loading attack path graph:', err);
      addToast(err.message || 'Failed to load attack path graph', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Load attack path graph when selectedScanId changes
  useEffect(() => {
    loadGraph();
  }, [selectedScanId]);

  // Modal Escape key support
  useEffect(() => {
    if (isRelateModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsRelateModalOpen(false);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isRelateModalOpen]);

  const handleCreateEdge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScanId || !sourceNodeId || !targetNodeId) return;
    if (sourceNodeId === targetNodeId) {
      addToast('Source node and target node must be different.', 'warning');
      return;
    }

    try {
      setCreatingEdge(true);
      await api.addAttackPathEdge(
        selectedScanId,
        sourceNodeId,
        targetNodeId,
        relationType,
        relationEvidence.trim() || undefined
      );
      addToast('Attack path relationship created successfully', 'success');
      setIsRelateModalOpen(false);
      setRelationEvidence('');
      await loadGraph();
    } catch (err: any) {
      addToast(err.message || 'Failed to create attack path relationship', 'error');
    } finally {
      setCreatingEdge(false);
    }
  };

  if (!loading && scans.length === 0) {
    return (
      <EmptyState
        icon={GitBranch}
        title="No Security Scans Available"
        description="Attack path topologies are generated from completed security assessments. Run a scan to discover exploitable pathways."
        actionLabel="Start a Security Scan"
        onAction={() => onNavigate('new-scan')}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Scan Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-purple-400" />
            Attack Path Visualization
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Correlates vulnerabilities, entry points, and endpoints into attack chains supported by scan evidence.
          </p>
        </div>

        {/* Scan Picker & Manual Relationship Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <label htmlFor="attack-path-scan-select" className="sr-only">Select scan</label>
          <select
            id="attack-path-scan-select"
            value={selectedScanId}
            onChange={(e) => setSelectedScanId(e.target.value)}
            className="bg-[#151c2a] border border-[#222c3d] text-gray-200 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 font-mono"
          >
            {scans.map((s) => (
              <option key={s.id} value={s.id}>
                {s.target_value} ({s.scan_mode}) — {s.strix_run_name || s.id.slice(0, 8)}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsRelateModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1b2333] hover:bg-[#243046] border border-[#2d3a52] text-purple-300 text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-purple-500"
          >
            <Plus className="w-3.5 h-3.5" />
            Relate Findings
          </button>
        </div>
      </div>

      {/* Graph Visualizer Canvas Area */}
      <div className="bg-[#0b0e14] border border-[#1d273a] rounded-xl p-6 min-h-[500px] flex flex-col justify-center items-center relative overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Constructing attack path topology from scan evidence...</span>
          </div>
        ) : !graph || !graph.has_sufficient_evidence ? (
          /* Insufficient Evidence Notice (Strict Security Rule) */
          <div className="max-w-md text-center p-8 bg-[#111726] border border-[#222d42] rounded-xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-950/40 border border-amber-800/50 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-200">
              Insufficient Evidence for Attack Path
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {graph?.notice ||
                'The current scan data does not provide sufficient chained exploitation evidence to construct a verified attack path graph without speculation.'}
            </p>
            <div className="pt-3 flex justify-center gap-2.5">
              <button
                onClick={() => onNavigate('findings')}
                className="px-4 py-2 bg-[#1b2436] hover:bg-[#232f47] text-xs font-medium text-gray-200 rounded-lg border border-[#2d3a52] transition-colors"
              >
                Inspect Individual Findings
              </button>
              <button
                onClick={() => setIsRelateModalOpen(true)}
                className="px-4 py-2 bg-purple-900/40 hover:bg-purple-900/70 text-xs font-medium text-purple-200 rounded-lg border border-purple-800/50 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Manually Relate Findings
              </button>
            </div>
          </div>
        ) : (
          /* Rendered Verified Attack Path Graph */
          <div className="w-full h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center text-xs text-gray-400 border-b border-[#1d273a] pb-3">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
                  Entry Points ({graph.nodes.filter((n) => n.node_type === 'entry_point').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500" />
                  Vulnerabilities ({graph.nodes.filter((n) => n.node_type === 'vulnerability').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500" />
                  Services ({graph.nodes.filter((n) => n.node_type === 'service').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500" />
                  Endpoints ({graph.nodes.filter((n) => n.node_type === 'endpoint').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500" />
                  Resources ({graph.nodes.filter((n) => n.node_type === 'resource').length})
                </span>
              </div>
              <span className="text-gray-500 font-mono">{graph.edges.length} Verified Relationship(s)</span>
            </div>

            {/* Visual Multi-Stage Column Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 py-6 items-start">
              {/* Stage 1: Entry Points */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider font-bold text-blue-400 text-center pb-1 border-b border-blue-900/40">
                  1. Entry Points
                </div>
                {graph.nodes.filter((n) => n.node_type === 'entry_point').length === 0 ? (
                  <div className="text-[11px] text-gray-600 text-center py-4 italic">None</div>
                ) : (
                  graph.nodes
                    .filter((n) => n.node_type === 'entry_point')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 bg-blue-950/20 border border-blue-800/50 rounded-lg text-center shadow-lg"
                      >
                        <div className="text-xs font-bold text-blue-300">{node.label}</div>
                        <div className="text-[10px] text-gray-400 mt-1">Network Attack Vector</div>
                      </div>
                    ))
                )}
              </div>

              {/* Stage 2: Vulnerabilities */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider font-bold text-red-400 text-center pb-1 border-b border-red-900/40">
                  2. Vulnerabilities
                </div>
                {graph.nodes.filter((n) => n.node_type === 'vulnerability').length === 0 ? (
                  <div className="text-[11px] text-gray-600 text-center py-4 italic">None</div>
                ) : (
                  graph.nodes
                    .filter((n) => n.node_type === 'vulnerability')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 bg-red-950/20 border border-red-800/50 rounded-lg text-center shadow-lg"
                      >
                        <div className="text-xs font-bold text-red-300">{node.label}</div>
                        <div className="text-[10px] text-gray-400 mt-1 font-mono">
                          {node.metadata?.category || 'Security Weakness'}
                        </div>
                      </div>
                    ))
                )}
              </div>

              {/* Stage 3: Services */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider font-bold text-amber-400 text-center pb-1 border-b border-amber-900/40">
                  3. Services
                </div>
                {graph.nodes.filter((n) => n.node_type === 'service').length === 0 ? (
                  <div className="text-[11px] text-gray-600 text-center py-4 italic">Direct Access</div>
                ) : (
                  graph.nodes
                    .filter((n) => n.node_type === 'service')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 bg-amber-950/20 border border-amber-800/50 rounded-lg text-center shadow-lg"
                      >
                        <div className="text-xs font-bold text-amber-300">{node.label}</div>
                        <div className="text-[10px] text-gray-400 mt-1">Backend Microservice</div>
                      </div>
                    ))
                )}
              </div>

              {/* Stage 4: Endpoints */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider font-bold text-purple-400 text-center pb-1 border-b border-purple-900/40">
                  4. Endpoints
                </div>
                {graph.nodes.filter((n) => n.node_type === 'endpoint').length === 0 ? (
                  <div className="text-[11px] text-gray-600 text-center py-4 italic">None</div>
                ) : (
                  graph.nodes
                    .filter((n) => n.node_type === 'endpoint')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 bg-purple-950/20 border border-purple-800/50 rounded-lg text-center shadow-lg"
                      >
                        <div className="text-xs font-bold text-purple-300 font-mono truncate">{node.label}</div>
                        <div className="text-[10px] text-gray-400 mt-1">Application Route</div>
                      </div>
                    ))
                )}
              </div>

              {/* Stage 5: Resources */}
              <div className="space-y-3">
                <div className="text-[11px] uppercase tracking-wider font-bold text-emerald-400 text-center pb-1 border-b border-emerald-900/40">
                  5. Sensitive Resources
                </div>
                {graph.nodes.filter((n) => n.node_type === 'resource').length === 0 ? (
                  <div className="text-[11px] text-gray-600 text-center py-4 italic">Target Asset</div>
                ) : (
                  graph.nodes
                    .filter((n) => n.node_type === 'resource')
                    .map((node) => (
                      <div
                        key={node.id}
                        className="p-3 bg-emerald-950/20 border border-emerald-800/50 rounded-lg text-center shadow-lg"
                      >
                        <div className="text-xs font-bold text-emerald-300">{node.label}</div>
                        <div className="text-[10px] text-gray-400 mt-1">Database / Secret</div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Edge list summary */}
            <div className="mt-4 pt-4 border-t border-[#1d273a]">
              <h4 className="text-xs font-semibold text-gray-300 mb-2">Evidence-Supported Transitions</h4>
              <div className="space-y-1.5 text-xs text-gray-400">
                {graph.edges.map((e) => (
                  <div
                    key={e.id}
                    className="p-2 rounded bg-[#111726] border border-[#1e2738] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-gray-300">{e.source}</span>
                      <span className="text-blue-400 font-semibold">&rarr; [{e.relation_type}] &rarr;</span>
                      <span className="font-mono text-gray-300">{e.target}</span>
                    </div>
                    {e.evidence && (
                      <span className="text-gray-500 font-mono text-[11px] truncate max-w-xs" title={e.evidence}>
                        Evidence: {e.evidence}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Relationship Modal */}
      {isRelateModalOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="relate-modal-title"
        >
          <div className="bg-[#111726] border border-[#1d273a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 id="relate-modal-title" className="text-base font-bold text-gray-100">
                  Manually Relate Attack Path Nodes
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Create a verified security link between two nodes where human analysis confirms relationship.
                </p>
              </div>
              <button
                onClick={() => setIsRelateModalOpen(false)}
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-200 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEdge} className="space-y-3">
              <div>
                <label htmlFor="source-node-select" className="text-xs text-gray-400 block mb-1">
                  Source Node (e.g. Entry or Vulnerability)
                </label>
                <select
                  id="source-node-select"
                  value={sourceNodeId}
                  onChange={(e) => setSourceNodeId(e.target.value)}
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono"
                >
                  {graph?.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.node_type.toUpperCase()}] {n.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="target-node-select" className="text-xs text-gray-400 block mb-1">
                  Target Node (e.g. Endpoint or Asset)
                </label>
                <select
                  id="target-node-select"
                  value={targetNodeId}
                  onChange={(e) => setTargetNodeId(e.target.value)}
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono"
                >
                  {graph?.nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      [{n.node_type.toUpperCase()}] {n.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="relation-type-select" className="text-xs text-gray-400 block mb-1">
                  Relation Type
                </label>
                <select
                  id="relation-type-select"
                  value={relationType}
                  onChange={(e) => setRelationType(e.target.value)}
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200"
                >
                  <option value="chains_to">chains_to (Sequentially Exploited)</option>
                  <option value="exploits">exploits (Attacks Asset)</option>
                  <option value="pivots_to">pivots_to (Lateral Movement)</option>
                  <option value="exfiltrates_from">exfiltrates_from (Data Breach)</option>
                </select>
              </div>

              <div>
                <label htmlFor="relation-evidence-input" className="text-xs text-gray-400 block mb-1">
                  Supporting Evidence / Notes (Optional)
                </label>
                <textarea
                  id="relation-evidence-input"
                  rows={2}
                  value={relationEvidence}
                  onChange={(e) => setRelationEvidence(e.target.value)}
                  placeholder="e.g. Verified by manual verification that SQL injection parameter dumps users table."
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg p-2.5 text-xs text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#1d273a]">
                <button
                  type="button"
                  onClick={() => setIsRelateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[#222d42] text-gray-400 hover:text-gray-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingEdge}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {creatingEdge ? 'Saving...' : 'Add Relationship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
