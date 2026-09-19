import React, { useState } from 'react';
import {
  FolderCode,
  GitFork,
  Globe,
  FileCode2,
  ShieldCheck,
  AlertTriangle,
  Play,
  ArrowRight,
  Info,
} from 'lucide-react';
import { api } from '../services/api';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const NewScan: React.FC<Props> = ({ onNavigate }) => {
  const [targetType, setTargetType] = useState<'local_project' | 'github_repo' | 'web_app' | 'api_spec'>('local_project');
  const [targetValue, setTargetValue] = useState('C:\\Users\\saabi\\OneDrive\\Desktop\\SignBridgeAI');
  const [projectName, setProjectName] = useState('SignBridgeAI');
  const [scanMode, setScanMode] = useState<'quick' | 'standard' | 'deep'>('deep');
  const [instruction, setInstruction] = useState('Focus on authentication, authorization, and input validation vulnerabilities.');
  const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);
  const [maxTurns, setMaxTurns] = useState<number | undefined>(undefined);
  const [authorized, setAuthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetTypes = [
    {
      id: 'local_project',
      label: 'Local Project',
      desc: 'Source code folder on this machine',
      icon: FolderCode,
      placeholder: 'C:\\Projects\\MyApplication',
      defaultVal: 'C:\\Users\\saabi\\OneDrive\\Desktop\\SignBridgeAI',
    },
    {
      id: 'github_repo',
      label: 'GitHub Repository',
      desc: 'Public or authorized git repository',
      icon: GitFork,
      placeholder: 'https://github.com/owner/repo',
      defaultVal: 'https://github.com/usestrix/strix',
    },
    {
      id: 'web_app',
      label: 'Web Application',
      desc: 'Live authorized web URL or staging host',
      icon: Globe,
      placeholder: 'https://staging.example.com',
      defaultVal: 'http://localhost:3000',
    },
    {
      id: 'api_spec',
      label: 'OpenAPI / Swagger',
      desc: 'REST API spec file path or URL',
      icon: FileCode2,
      placeholder: 'C:\\Specs\\openapi.yaml or https://api.com/swagger.json',
      defaultVal: '',
    },
  ];

  const handleSelectType = (typeId: any) => {
    setTargetType(typeId);
    const match = targetTypes.find((t) => t.id === typeId);
    if (match) {
      setTargetValue(match.defaultVal);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorized) {
      setError('You must acknowledge that you have explicit authorization to scan this target.');
      return;
    }
    if (!targetValue.trim()) {
      setError('Target value cannot be empty.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const scan = await api.createScan({
        target_type: targetType,
        target_value: targetValue.trim(),
        project_name: projectName.trim() || undefined,
        scan_mode: scanMode,
        instruction: instruction.trim() || undefined,
        max_budget: maxBudget,
        max_turns: maxTurns,
        authorization_acknowledged: true,
      });

      // Navigate to the live scan monitor
      onNavigate(`scans/${scan.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate security scan.');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <Play className="w-5 h-5 text-blue-400" />
          New Security Scan Wizard
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Configure an authorized penetration test using the installed Strix 1.6.2 engine.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-lg text-red-300 text-sm flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Target Type */}
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-3">
          <label className="text-sm font-semibold text-gray-200 block">
            STEP 1: Select Target Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {targetTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = targetType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectType(t.id)}
                  className={`flex flex-col items-start p-4 rounded-lg border text-left transition-all ${
                    isSelected
                      ? 'bg-blue-600/15 border-blue-500/50 shadow-md shadow-blue-500/10'
                      : 'bg-[#141b29] border-[#222d42] hover:border-[#324260]'
                  }`}
                >
                  <Icon className={`w-6 h-6 mb-2 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`} />
                  <div className={`font-semibold text-sm ${isSelected ? 'text-gray-100' : 'text-gray-300'}`}>
                    {t.label}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 leading-snug">{t.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Target Path/URL Input */}
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-4">
          <label className="text-sm font-semibold text-gray-200 block">
            STEP 2: Target Identifier & Project Name
          </label>

          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Project Name (Optional label)</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. SignBridgeAI"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3.5 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                Target Path, URL, or Specification
              </label>
              <input
                type="text"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={targetTypes.find((t) => t.id === targetType)?.placeholder}
                required
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3.5 py-2.5 text-sm text-gray-100 focus:outline-none focus:border-blue-500 font-mono"
              />
              <p className="text-xs text-gray-500 mt-1.5">
                {targetType === 'local_project' && 'Directory will be mounted read/write into the Strix Docker sandbox.'}
                {targetType === 'github_repo' && 'Enter public or authorized GitHub clone URL.'}
                {targetType === 'web_app' && 'Ensure host is reachable from this machine.'}
                {targetType === 'api_spec' && 'Local OpenAPI file path or HTTP URL to swagger.json.'}
              </p>
            </div>
          </div>
        </div>

        {/* Step 3: Scan Configuration */}
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-4">
          <label className="text-sm font-semibold text-gray-200 block">
            STEP 3: Scan Configuration
          </label>

          {/* Scan Mode Radio Cards */}
          <div>
            <label className="text-xs text-gray-400 block mb-2">Scan Mode</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'quick', title: 'Quick Mode', desc: 'Fast surface check for CI/CD' },
                { id: 'standard', title: 'Standard Mode', desc: 'Routine penetration test' },
                { id: 'deep', title: 'Deep Mode (Default)', desc: 'Thorough, exhaustive security review' },
              ].map((m) => (
                <label
                  key={m.id}
                  className={`flex flex-col p-3.5 rounded-lg border cursor-pointer transition-all ${
                    scanMode === m.id
                      ? 'bg-blue-600/15 border-blue-500/50'
                      : 'bg-[#141b29] border-[#222d42] hover:border-[#324260]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-200">{m.title}</span>
                    <input
                      type="radio"
                      name="scanMode"
                      value={m.id}
                      checked={scanMode === m.id}
                      onChange={() => setScanMode(m.id as any)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                  <span className="text-xs text-gray-400 mt-1">{m.desc}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              Custom Penetration Testing Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Focus on IDOR, SQL injection, and authorization weaknesses."
              className="w-full bg-[#141b29] border border-[#222d42] rounded-lg p-3 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Budget & Turns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Max Budget (USD, Optional)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={maxBudget || ''}
                onChange={(e) => setMaxBudget(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Unlimited"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Max Turns per Agent (Optional)</label>
              <input
                type="number"
                min="10"
                max="1000"
                value={maxTurns || ''}
                onChange={(e) => setMaxTurns(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="Default: 500"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Authorization Acknowledgment (Strict Security Rule) */}
        <div className="bg-amber-950/20 border border-amber-800/40 p-5 rounded-xl space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
            Mandatory Authorization Notice
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            "Only scan applications and systems that you own or have explicit authorization to test."
            Unauthorized security testing of external systems violates computer security laws and terms of service.
          </p>
          <label className="flex items-center gap-3 pt-2 cursor-pointer">
            <input
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="w-4 h-4 rounded border-gray-700 text-blue-600 focus:ring-blue-500 bg-[#141b29]"
            />
            <span className="text-xs font-medium text-gray-200">
              I acknowledge and confirm that I own or have explicit legal authorization to test this target.
            </span>
          </label>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="px-5 py-2.5 rounded-lg border border-[#222d42] text-gray-400 hover:text-gray-200 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!authorized || submitting}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${
              authorized && !submitting
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 cursor-pointer'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700/50'
            }`}
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing Strix Scan...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Start Strix Security Assessment
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
