import React, { useState } from 'react';
import { Sparkles, Cpu, RefreshCw, Layers, ShieldCheck, AlertCircle } from 'lucide-react';
import { ProviderStatus, ProviderMode } from '../types';
import { api } from '../services/api';

interface Props {
  title: string;
  providerStatus?: ProviderStatus;
  dockerRunning?: boolean;
  onRefreshProvider?: () => void;
}

export const Header: React.FC<Props> = ({
  title,
  providerStatus,
  dockerRunning,
  onRefreshProvider,
}) => {
  const [switching, setSwitching] = useState(false);

  const handleModeChange = async (newMode: ProviderMode) => {
    try {
      setSwitching(true);
      await api.updateProviderMode(newMode);
      if (onRefreshProvider) onRefreshProvider();
    } catch (err) {
      console.error('Failed to change provider mode:', err);
    } finally {
      setSwitching(false);
    }
  };

  const handleResetCooldown = async () => {
    try {
      setSwitching(true);
      await api.resetGeminiCooldown();
      if (onRefreshProvider) onRefreshProvider();
    } catch (err) {
      console.error('Failed to reset cooldown:', err);
    } finally {
      setSwitching(false);
    }
  };

  const active = providerStatus?.active_provider || 'GEMINI';
  const mode = providerStatus?.mode || 'AUTO';
  const inCooldown = (providerStatus?.gemini_cooldown_remaining_seconds || 0) > 0;

  return (
    <header className="h-16 px-6 bg-[#0d121c] border-b border-[#1a2333] flex items-center justify-between z-10">
      {/* Title */}
      <h1 className="text-lg font-semibold text-gray-100 capitalize">{title}</h1>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Docker Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
            dockerRunning
              ? 'bg-blue-950/40 text-blue-400 border-blue-800/50'
              : 'bg-red-950/40 text-red-400 border-red-800/50'
          }`}
          title={dockerRunning ? 'Docker sandbox is available' : 'Docker is not running'}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Docker: {dockerRunning ? 'Running' : 'Offline'}</span>
        </div>

        {/* LLM Provider Status & Failover Widget */}
        <div className="flex items-center gap-2 bg-[#121824] border border-[#1e2738] rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <Sparkles
              className={`w-3.5 h-3.5 ${
                active === 'GEMINI' ? 'text-cyan-400' : 'text-purple-400'
              }`}
            />
            <span className="text-gray-400">LLM Engine:</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
                active === 'GEMINI'
                  ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-800/40'
                  : 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
              }`}
            >
              {active}
            </span>
          </div>

          {/* Cooldown Alert if Gemini hit 429 */}
          {inCooldown && (
            <div className="flex items-center gap-1 text-amber-400 font-mono text-[11px] bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
              <AlertCircle className="w-3 h-3" />
              <span>Cooldown ({providerStatus?.gemini_cooldown_remaining_seconds}s)</span>
              <button
                onClick={handleResetCooldown}
                disabled={switching}
                className="hover:underline ml-1 font-sans text-amber-300 text-[10px]"
                title="Reset cooldown and retry Gemini immediately"
              >
                [Reset]
              </button>
            </div>
          )}

          {/* Mode Dropdown */}
          <div className="flex items-center gap-1 pl-2 border-l border-[#243044]">
            <span className="text-gray-400">Mode:</span>
            <select
              value={mode}
              disabled={switching}
              onChange={(e) => handleModeChange(e.target.value as ProviderMode)}
              className="bg-[#182030] text-gray-200 border border-[#2b3850] rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="AUTO">AUTO (Gemini → Ollama Fallback)</option>
              <option value="GEMINI">GEMINI Only</option>
              <option value="OLLAMA">OLLAMA (Local)</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
