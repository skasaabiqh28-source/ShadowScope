import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  ShieldCheck,
  Play,
  CheckCircle2,
  AlertTriangle,
  Info,
  ExternalLink,
} from 'lucide-react';
import { TrainingLab } from '../types';
import { api } from '../services/api';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const TrainingLabs: React.FC<Props> = ({ onNavigate }) => {
  const [labs, setLabs] = useState<TrainingLab[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await api.listTrainingLabs();
        setLabs(data);
      } catch (err) {
        console.error('Failed to load training labs:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleLaunchLab = async (lab: TrainingLab) => {
    if (!confirm(`Launch an authorized educational assessment against '${lab.title}'?`)) return;

    try {
      setLaunchingId(lab.id);
      const scan = await api.launchLabScan(lab.id);
      onNavigate(`scans/${scan.id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to launch lab scan.');
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

            <div className="mt-6 pt-4 border-t border-[#1a2333]">
              <button
                onClick={() => handleLaunchLab(lab)}
                disabled={launchingId === lab.id}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-semibold rounded-lg transition-colors shadow-md shadow-blue-600/20"
              >
                {launchingId === lab.id ? (
                  <span>Initializing Lab Scan...</span>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Training Scan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
