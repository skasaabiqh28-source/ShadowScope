import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
  X,
  Settings,
} from 'lucide-react';
import { TrainingLab } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/LoadingSkeleton';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const TrainingLabs: React.FC<Props> = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [labs, setLabs] = useState<TrainingLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [selectedLab, setSelectedLab] = useState<TrainingLab | null>(null);
  const [customTarget, setCustomTarget] = useState('');
  const [selectedScanMode, setSelectedScanMode] = useState('quick');
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.listTrainingLabs();
        setLabs(data);
      } catch (err: any) {
        console.error('Failed to load training labs:', err);
        addToast(err.message || 'Failed to load training labs', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Modal Escape key support
  useEffect(() => {
    if (selectedLab) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedLab(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedLab]);

  const openConfigureModal = (lab: TrainingLab) => {
    setSelectedLab(lab);
    setCustomTarget(lab.default_target);
    setSelectedScanMode(lab.recommended_mode || 'quick');
    setAuthorized(false);
  };

  const handleLaunchLab = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedLab) return;
    if (!authorized) {
      addToast('You must acknowledge that this is an authorized training target.', 'warning');
      return;
    }

    try {
      setLaunchingId(selectedLab.id);
      const scan = await api.launchLabScan(selectedLab.id, customTarget.trim() || undefined, selectedScanMode);
      addToast('Lab scan initialized successfully! Redirecting to monitor...', 'success');
      setSelectedLab(null);
      onNavigate(`scans/${scan.id}`);
    } catch (err: any) {
      addToast(err.message || 'Failed to launch lab scan.', 'error');
      setLaunchingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-emerald-400" />
          Authorized Security Training Labs
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Learn and practice application security testing against intentionally vulnerable and controlled target environments.
        </p>
      </div>

      {/* Labs Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-72" />
          <SkeletonCard height="h-72" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {labs.map((lab) => (
            <div
              key={lab.id}
              className="bg-[#111726] border border-[#1d273a] rounded-xl p-5 flex flex-col justify-between hover:border-blue-500/40 transition-all shadow-lg"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                    {lab.category}
                  </span>
                  <span className="text-[10px] font-mono text-gray-400">{lab.difficulty}</span>
                </div>

                <h3 className="text-base font-bold text-gray-100">{lab.title}</h3>

                <p className="text-xs text-gray-300 leading-relaxed">{lab.description}</p>

                <div className="p-2.5 bg-[#0e1320] border border-[#1a2333] rounded-lg text-xs space-y-1 font-mono">
                  <div className="text-gray-500 text-[10px]">DEFAULT TARGET:</div>
                  <div className="text-cyan-300 truncate" title={lab.default_target}>
                    {lab.default_target}
                  </div>
                </div>

                <div className="text-[11px] text-gray-400 flex items-start gap-1.5 pt-1">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span>{lab.instruction}</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#1a2333] flex gap-2">
                <button
                  onClick={() => openConfigureModal(lab)}
                  disabled={launchingId === lab.id}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {launchingId === lab.id ? (
                    <span>Launching...</span>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Launch Lab Scan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lab Configuration Accessible Modal */}
      {selectedLab && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lab-config-title"
        >
          <div className="bg-[#111726] border border-[#1d273a] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                  {selectedLab.category} — {selectedLab.difficulty}
                </span>
                <h3 id="lab-config-title" className="text-base font-bold text-gray-100 mt-2">
                  {selectedLab.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedLab(null)}
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-200 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-300">{selectedLab.description}</p>

            <form onSubmit={handleLaunchLab} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="custom-lab-target" className="text-gray-400 block mb-1 font-semibold">
                  Target Address or URL
                </label>
                <input
                  id="custom-lab-target"
                  type="text"
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  placeholder={selectedLab.default_target}
                  required
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="custom-scan-intensity" className="text-gray-400 block mb-1 font-semibold">
                  Scan Intensity Mode
                </label>
                <select
                  id="custom-scan-intensity"
                  value={selectedScanMode}
                  onChange={(e) => setSelectedScanMode(e.target.value)}
                  className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="quick">Quick (Surface assessment for lab test)</option>
                  <option value="standard">Standard (Comprehensive verification)</option>
                  <option value="deep">Deep (Exhaustive penetration test)</option>
                </select>
              </div>

              <div className="p-3 bg-[#0d121c] border border-[#1a2333] rounded-lg">
                <div className="text-gray-400 font-semibold mb-1">Strix Instructions:</div>
                <div className="text-gray-300 font-mono text-[11px]">{selectedLab.instruction}</div>
              </div>

              <div className="bg-amber-950/30 border border-amber-800/40 p-3 rounded-lg space-y-2">
                <div className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" /> Training Scope Acknowledgment
                </div>
                <p className="text-gray-300 text-[11px] leading-relaxed">
                  {selectedLab.authorization_notice}
                </p>
                <label htmlFor="lab-auth-checkbox" className="flex items-center gap-2 pt-1 cursor-pointer">
                  <input
                    id="lab-auth-checkbox"
                    type="checkbox"
                    checked={authorized}
                    onChange={(e) => setAuthorized(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 bg-[#141b29]"
                  />
                  <span className="text-gray-200 font-medium text-[11px]">
                    I confirm that this test is conducted within an authorized training environment.
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-[#1d273a]">
                <button
                  type="button"
                  onClick={() => setSelectedLab(null)}
                  className="px-4 py-2 border border-[#222d42] text-gray-400 hover:text-gray-200 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!authorized || launchingId === selectedLab.id}
                  className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white font-medium rounded-lg transition-colors shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {launchingId === selectedLab.id ? 'Starting Scan...' : 'Start Training Scan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
