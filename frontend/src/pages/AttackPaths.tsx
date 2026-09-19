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
} from 'lucide-react';
import { AttackPathGraph, Scan } from '../types';
import { api } from '../services/api';

interface Props {
  initialScanId?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const AttackPaths: React.FC<Props> = ({ initialScanId, onNavigate }) => {
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>(initialScanId || '');
  const [graph, setGraph] = useState<AttackPathGraph | null>(null);
  const [loading, setLoading] = useState(true);

  // Load available scans
  useEffect(() => {
    const loadScans = async () => {
      try {
        const list = await api.listScans();
        setScans(list);
        if (!selectedScanId && list.length > 0) {
          setSelectedScanId(list[0].id);
        }
      } catch (err) {
        console.error('Error fetching scans for attack path:', err);
      }
    };
    loadScans();
  }, []);

  // Load attack path graph when selectedScanId changes
  useEffect(() => {
    if (!selectedScanId) {
      setLoading(false);
      return;
    }

    const loadGraph = async () => {
      try {
        setLoading(true);
        const g = await api.getAttackPathGraph(selectedScanId);
        setGraph(g);
      } catch (err) {
        console.error('Error loading attack path graph:', err);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [selectedScanId]);

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

        {/* Scan Picker */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Select Scan:</span>
          <select
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
        </div>
      </div>

      {/* Graph Visualizer Canvas Area */}
      <div className="bg-[#0b0e14] border border-[#1d273a] rounded-xl p-6 min-h-[500px] flex flex-col justify-center items-center relative overflow-hidden">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
            <span>Constructing attack path topology...</span>
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
            <div className="pt-2">
              <button
                onClick={() => onNavigate('findings')}
                className="px-4 py-2 bg-[#1b2436] hover:bg-[#232f47] text-xs font-medium text-gray-200 rounded-lg border border-[#2d3a52] transition-colors"
              >
                Inspect Individual Findings
              </button>
            </div>
          </div>
        ) : (
          /* Rendered Verified Attack Path Graph */
          <div className="w-full h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center text-xs text-gray-400 border-b border-[#1d273a] pb-3">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-blue-500/20 border border-blue-500" />
                  Entry Points ({graph.nodes.filter((n) => n.node_type === 'entry_point').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500" />
                  Vulnerabilities ({graph.nodes.filter((n) => n.node_type === 'vulnerability').length})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500" />
                  Endpoints ({graph.nodes.filter((n) => n.node_type === 'endpoint').length})
                </span>
              </div>
              <span className="text-gray-500 font-mono">{graph.edges.length} Verified Relationship(s)</span>
            </div>

            {/* Visual Node / Edge flow representation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6 items-center">
              {/* Column 1: Entry Points */}
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-blue-400 text-center">
                  Stage 1: Entry Points
                </div>
                {graph.nodes
                  .filter((n) => n.node_type === 'entry_point')
                  .map((node) => (
                    <div
                      key={node.id}
                      className="p-4 bg-blue-950/20 border border-blue-800/50 rounded-xl text-center shadow-lg"
                    >
                      <div className="text-xs font-bold text-blue-300">{node.label}</div>
                      <div className="text-[11px] text-gray-400 mt-1">Network Attack Vector</div>
                    </div>
                  ))}
              </div>

              {/* Column 2: Vulnerabilities */}
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-red-400 text-center">
                  Stage 2: Vulnerabilities
                </div>
                {graph.nodes
                  .filter((n) => n.node_type === 'vulnerability')
                  .map((node) => (
                    <div
                      key={node.id}
                      className="p-4 bg-red-950/20 border border-red-800/50 rounded-xl text-center shadow-lg relative group"
                    >
                      <div className="text-xs font-bold text-red-300">{node.label}</div>
                      <div className="text-[10px] text-gray-400 mt-1 font-mono">
                        {node.metadata?.category || 'Security Weakness'}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Column 3: Sensitive Endpoints / Resources */}
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider font-semibold text-purple-400 text-center">
                  Stage 3: Affected Assets
                </div>
                {graph.nodes
                  .filter((n) => n.node_type === 'endpoint')
                  .map((node) => (
                    <div
                      key={node.id}
                      className="p-4 bg-purple-950/20 border border-purple-800/50 rounded-xl text-center shadow-lg"
                    >
                      <div className="text-xs font-bold text-purple-300 font-mono truncate">{node.label}</div>
                      <div className="text-[11px] text-gray-400 mt-1">Application Endpoint</div>
                    </div>
                  ))}
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
    </div>
  );
};
