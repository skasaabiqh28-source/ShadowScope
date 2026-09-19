import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  MessageSquare,
  Bot,
  MapPin,
  Globe,
  Code2,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Finding, FindingStatus } from '../types';
import { api } from '../services/api';
import { SeverityBadge } from '../components/SeverityBadge';
import { StatusBadge } from '../components/StatusBadge';

interface Props {
  findingId: string;
  onNavigate: (route: string, param?: string) => void;
}

export const FindingDetail: React.FC<Props> = ({ findingId, onNavigate }) => {
  const [finding, setFinding] = useState<Finding | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteContent, setNoteContent] = useState('');
  const [updating, setUpdating] = useState(false);
  const [retesting, setRetesting] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FindingStatus>('Fixed');
  const [statusNote, setStatusNote] = useState('');

  const loadFinding = async () => {
    try {
      setLoading(true);
      const data = await api.getFinding(findingId);
      setFinding(data);
    } catch (err) {
      console.error('Failed to load finding:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinding();
  }, [findingId]);

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      await api.updateFindingStatus(findingId, selectedStatus, statusNote);
      setStatusModalOpen(false);
      setStatusNote('');
      await loadFinding();
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      setUpdating(true);
      await api.addFindingNote(findingId, noteContent.trim());
      setNoteContent('');
      await loadFinding();
    } catch (err: any) {
      alert(err.message || 'Failed to add note');
    } finally {
      setUpdating(false);
    }
  };

  const handleRequestRetest = async () => {
    if (!confirm('Initiate a targeted Strix retest scan to verify if this vulnerability is resolved?')) return;
    try {
      setRetesting(true);
      const res = await api.retestFinding(
        findingId,
        `Retest verification for ${finding?.title}`
      );
      alert('Retest scan launched successfully! Redirecting to scan monitor...');
      onNavigate(`scans/${res.retest_scan_id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to trigger retest');
      setRetesting(false);
    }
  };

  if (loading && !finding) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        <span>Loading vulnerability details...</span>
      </div>
    );
  }

  if (!finding) {
    return (
      <div className="p-6 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300">
        Finding not found.
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top back button & actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <button
          onClick={() => onNavigate('findings')}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Findings
        </button>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setSelectedStatus('Fixed');
              setStatusModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-xs font-medium transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark Fixed / Update Status
          </button>

          <button
            onClick={handleRequestRetest}
            disabled={retesting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-md shadow-blue-600/20"
          >
            <RefreshCw className={`w-4 h-4 ${retesting ? 'animate-spin' : ''}`} />
            Request Retest Scan
          </button>

          <button
            onClick={() => onNavigate('assistant', finding.id)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-950/80 border border-purple-800/60 text-purple-300 text-xs font-medium transition-colors"
          >
            <Bot className="w-4 h-4" />
            Ask Assistant
          </button>
        </div>
      </div>

      {/* Main Finding Card */}
      <div className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <SeverityBadge severity={finding.severity} size="md" />
            <StatusBadge status={finding.status} />
            <span className="text-xs text-gray-400 font-medium px-2 py-0.5 rounded bg-[#182030] border border-[#26334d]">
              {finding.category}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-100">{finding.title}</h2>
        </div>

        {/* Location & Endpoints */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 bg-[#0e1320] border border-[#1d273a] rounded-lg text-xs">
          <div className="flex items-center gap-2 text-gray-300">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span className="text-gray-500 shrink-0">Location:</span>
            <code className="text-cyan-300 font-mono truncate" title={finding.location || ''}>
              {finding.location || 'N/A'}
            </code>
          </div>
          {finding.endpoint && (
            <div className="flex items-center gap-2 text-gray-300">
              <Globe className="w-4 h-4 text-purple-400 shrink-0" />
              <span className="text-gray-500 shrink-0">Endpoint:</span>
              <code className="text-purple-300 font-mono truncate" title={finding.endpoint}>
                {finding.endpoint}
              </code>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Vulnerability Description
          </h3>
          <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
            {finding.description}
          </p>
        </div>

        {/* Evidence / Code Flow */}
        {finding.evidence && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-emerald-400" />
              Scan Evidence / Trace
            </h3>
            <div className="bg-[#090c12] border border-[#1a2333] p-4 rounded-lg overflow-x-auto">
              <pre className="text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap">
                {finding.evidence}
              </pre>
            </div>
          </div>
        )}

        {/* Impact */}
        {finding.impact && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Technical & Business Impact
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed bg-red-950/10 border border-red-900/30 p-3.5 rounded-lg">
              {finding.impact}
            </p>
          </div>
        )}

        {/* Remediation Recommendation */}
        {finding.recommendation && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Remediation Guidance
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed bg-emerald-950/10 border border-emerald-900/30 p-3.5 rounded-lg whitespace-pre-wrap">
              {finding.recommendation}
            </p>
          </div>
        )}
      </div>

      {/* Analyst Notes Section */}
      <div className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-400" />
          Analyst Notes & Audit Timeline
        </h3>

        {/* List notes */}
        <div className="space-y-3">
          {finding.notes && finding.notes.length > 0 ? (
            finding.notes.map((note) => (
              <div key={note.id} className="p-3.5 bg-[#0e1320] border border-[#1d273a] rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center text-gray-400">
                  <span className="font-semibold text-blue-400">{note.author}</span>
                  <span className="text-gray-500 font-mono">
                    {new Date(note.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-gray-200 leading-relaxed">{note.content}</p>
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500 italic">No notes added yet.</div>
          )}
        </div>

        {/* Add Note Form */}
        <form onSubmit={handleAddNote} className="pt-2 flex gap-3">
          <input
            type="text"
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Add an internal analyst note or fix reference..."
            className="flex-1 bg-[#141b29] border border-[#222d42] rounded-lg px-3.5 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={updating || !noteContent.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Add Note
          </button>
        </form>
      </div>

      {/* Retest History Audit Section */}
      {finding.retests && finding.retests.length > 0 && (
        <div className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
          <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Retest Verification History
          </h3>
          <div className="space-y-2 text-xs">
            {finding.retests.map((rt) => (
              <div key={rt.id} className="p-3 bg-[#0e1320] border border-[#1d273a] rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-semibold text-gray-200 mr-2">{rt.result}</span>
                  <span className="text-gray-400 font-mono">({rt.previous_status} &rarr; {rt.new_status})</span>
                  {rt.notes && <p className="text-gray-400 text-[11px] mt-1">{rt.notes}</p>}
                </div>
                <span className="text-gray-500 text-[11px] font-mono">
                  {new Date(rt.timestamp).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111726] border border-[#1d273a] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-gray-100">Update Finding Status</h3>
            <p className="text-xs text-gray-400">
              Change status and document rationale in the security audit trail.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">New Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as FindingStatus)}
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Fixed">Fixed</option>
                  <option value="Accepted Risk">Accepted Risk</option>
                  <option value="Retest Required">Retest Required</option>
                  <option value="Open">Open</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Note / Remediation Detail</label>
                <textarea
                  rows={3}
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  placeholder="e.g. Applied parameterized queries in auth_service.py commit a1b2c3d."
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg p-2.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setStatusModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#222d42] text-gray-400 hover:text-gray-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStatusUpdate}
                disabled={updating}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
              >
                {updating ? 'Saving...' : 'Confirm Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
