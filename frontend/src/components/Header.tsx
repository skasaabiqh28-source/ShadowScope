import React, { useState, useEffect } from 'react';
import { Terminal, Cpu, RefreshCw, AlertCircle, Menu, Shield } from 'lucide-react';
import { ProviderStatus, ProviderMode } from '../types';
import { api } from '../services/api';

interface Props {
  title: string;
  providerStatus?: ProviderStatus;
  dockerRunning?: boolean;
  onRefreshProvider?: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header: React.FC<Props> = ({
  title,
  providerStatus,
  dockerRunning,
  onRefreshProvider,
  onToggleMobileMenu,
}) => {
  const [switching, setSwitching] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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
    <header className="h-14 px-4 bg-black border-b border-[#1f521f] flex items-center justify-between z-10 shrink-0 font-mono text-xs select-none">
      {/* Shell Prompt & Route Name */}
      <div className="flex items-center space-x-3 overflow-hidden">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            aria-label="Open navigation menu"
            className="md:hidden text-[#33ff00] p-1 border border-[#1f521f] hover:bg-[#33ff00] hover:text-black"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center space-x-2 font-mono">
          <span className="text-[#1f521f] font-bold">#</span>
          <span className="text-[#33ff00] font-bold">root@shadowscope</span>
          <span className="text-[#1f521f]">:</span>
          <span className="text-[#94a3b8]">~/{title.toLowerCase().replace(/\s+/g, '_')}</span>
          <span className="cursor-block ml-1" />
        </div>
      </div>

      {/* Right Telemetry Controls */}
      <div className="flex items-center space-x-3">
        {/* Live Clock */}
        <div className="hidden lg:flex items-center text-[#1f521f] text-[11px] font-mono">
          <span>{currentTime}</span>
        </div>

        {/* Docker Sandbox Flag */}
        <div
          className={`hidden sm:flex items-center space-x-1.5 px-2 py-0.5 border text-[11px] font-mono uppercase ${
            dockerRunning
              ? 'border-[#33ff00] text-[#33ff00] bg-[#33ff00]/10'
              : 'border-[#1f521f] text-[#94a3b8] bg-black'
          }`}
          title={dockerRunning ? 'Docker sandbox is active' : 'Docker sandbox offline'}
        >
          <span className="text-[#1f521f]">[</span>
          <span>SANDBOX: {dockerRunning ? 'UP' : 'OFFLINE'}</span>
          <span className="text-[#1f521f]">]</span>
        </div>

        {/* LLM Engine Control Box */}
        <div className="flex items-center space-x-2 border border-[#1f521f] px-2.5 py-1 bg-[#050c05] text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-[#1f521f]">LLM:</span>
            <span
              className={`font-bold uppercase ${
                active === 'GEMINI' ? 'text-[#33ff00]' : 'text-[#ffb000]'
              }`}
            >
              {active}
            </span>
          </div>

          {/* Cooldown Alert if Gemini hit 429 */}
          {inCooldown && (
            <div className="flex items-center space-x-1 text-[#ffb000] border-l border-[#1f521f] pl-2">
              <AlertCircle className="w-3 h-3 text-[#ffb000]" />
              <span className="text-[10px]">CD:{providerStatus?.gemini_cooldown_remaining_seconds}s</span>
              <button
                onClick={handleResetCooldown}
                disabled={switching}
                className="text-[#ffb000] hover:bg-[#ffb000] hover:text-black px-1 uppercase text-[9px] border border-[#ffb000]"
                title="Reset cooldown"
              >
                CLR
              </button>
            </div>
          )}

          {/* Mode Selector */}
          <div className="flex items-center space-x-1 border-l border-[#1f521f] pl-2">
            <span className="text-[#1f521f]">MODE:</span>
            <select
              value={mode}
              disabled={switching}
              onChange={(e) => handleModeChange(e.target.value as ProviderMode)}
              className="bg-black text-[#33ff00] border border-[#1f521f] px-1 py-0 text-[10px] uppercase font-mono focus:outline-none focus:border-[#33ff00] cursor-pointer"
            >
              <option value="AUTO">AUTO (GEMINI-&gt;OLLAMA)</option>
              <option value="GEMINI">GEMINI_ONLY</option>
              <option value="OLLAMA">OLLAMA_LOCAL</option>
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
