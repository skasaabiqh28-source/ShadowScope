import React, { useState, useEffect } from 'react';
import {
  Terminal,
  FolderCode,
  GitFork,
  Globe,
  FileCode2,
  ShieldCheck,
  AlertTriangle,
  Play,
  Copy,
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { TerminalPane } from '../components/TerminalPane';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const NewScan: React.FC<Props> = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [targetType, setTargetType] = useState<'local_project' | 'github_repo' | 'web_app' | 'api_spec'>('local_project');
  const [targetValue, setTargetValue] = useState('');
  const [projectName, setProjectName] = useState('');
  const [scanMode, setScanMode] = useState<'quick' | 'standard' | 'deep'>('deep');
  const [instruction, setInstruction] = useState('Focus on authentication, authorization, and input validation vulnerabilities.');
  const [maxBudget, setMaxBudget] = useState<number | undefined>(undefined);
  const [maxTurns, setMaxTurns] = useState<number | undefined>(undefined);
  const [authorized, setAuthorized] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const prefillTarget = sessionStorage.getItem('prefill_scan_target');
      const prefillType = sessionStorage.getItem('prefill_scan_type');
      const prefillInstruction = sessionStorage.getItem('prefill_scan_instruction');
      if (prefillTarget) {
        setTargetValue(prefillTarget);
        sessionStorage.removeItem('prefill_scan_target');
      }
      if (prefillType) {
        setTargetType(prefillType as any);
        sessionStorage.removeItem('prefill_scan_type');
      }
      if (prefillInstruction) {
        setInstruction(prefillInstruction);
        sessionStorage.removeItem('prefill_scan_instruction');
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const estimatedCommand = `strix --target "${targetValue || '<target>'}" --scan-mode ${scanMode}${instruction ? ` --instruction "${instruction.replace(/"/g, '\\"')}"` : ''}${maxBudget ? ` --max-budget ${maxBudget}` : ''}${maxTurns ? ` --max-turns ${maxTurns}` : ''} --non-interactive`;

  const targetTypes = [
    {
      id: 'local_project',
      code: '01',
      label: 'LOCAL_PROJECT',
      desc: 'Local directory on disk',
      icon: FolderCode,
      placeholder: 'C:\\Users\\...\\Project or /home/.../code',
    },
    {
      id: 'github_repo',
      code: '02',
      label: 'GITHUB_REPO',
      desc: 'Remote Git repository',
      icon: GitFork,
      placeholder: 'https://github.com/owner/repo',
    },
    {
      id: 'web_app',
      code: '03',
      label: 'WEB_APPLICATION',
      desc: 'Live authorized URL',
      icon: Globe,
      placeholder: 'https://staging.target.internal',
    },
    {
      id: 'api_spec',
      code: '04',
      label: 'OPENAPI_SPEC',
      desc: 'REST API spec file/URL',
      icon: FileCode2,
      placeholder: 'C:\\Specs\\openapi.yaml or https://.../swagger.json',
    },
  ];

  const handleTargetChange = (val: string) => {
    setTargetValue(val);
    if (!projectName && targetType === 'local_project' && val.trim()) {
      const parts = val.trim().replace(/[\\/]+$/, '').split(/[\\/]/);
      const last = parts[parts.length - 1];
      if (last && !last.includes(':')) {
        setProjectName(last);
      }
    }
  };

  const handleClear = () => {
    setTargetValue('');
    setProjectName('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorized) {
      const msg = 'LEGAL_AUTH_REQUIRED: You must certify authorization to assess this target.';
      setError(msg);
      addToast(msg, 'warning');
      return;
    }
    if (!targetValue.trim()) {
      const msg = 'TARGET_REQUIRED: Target path or URI cannot be empty.';
      setError(msg);
      addToast(msg, 'warning');
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

      addToast('[SYS_OK] Scan initiated. Transferring to monitor...', 'success');
      onNavigate(`scans/${scan.id}`);
    } catch (err: any) {
      const msg = err.message || 'EXEC_ERR: Failed to initiate scan.';
      setError(msg);
      addToast(msg, 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-mono text-xs">
      {/* Title Pane */}
      <TerminalPane title="INIT_SECURITY_SCAN" prefix="WIZARD">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[#33ff00] font-bold text-sm tracking-wider uppercase terminal-glow flex items-center gap-2">
              <Terminal className="w-4 h-4 text-[#33ff00]" />
              AUTONOMOUS PENETRATION TESTING CONFIGURATOR
            </div>
            <p className="text-[11px] text-[#94a3b8] mt-0.5">
              Specify target parameters, review isolated execution flags, and launch Strix engine.
            </p>
          </div>
          <div className="hidden sm:block text-[10px] text-[#1f521f] text-right">
            <span>ISOLATION: DOCKER_CONTAINER</span><br />
            <span>PRIVILEGES: SANDBOXED</span>
          </div>
        </div>
      </TerminalPane>

      {error && (
        <div
          role="alert"
          className="p-3 bg-[#ff3333]/10 border border-[#ff3333] text-[#ff3333] flex items-center space-x-2"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#ff3333]" />
          <span className="font-bold">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Step 1: Target Vector */}
        <TerminalPane title="STEP_01: TARGET_VECTOR" prefix="CFG">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {targetTypes.map((t) => {
              const Icon = t.icon;
              const isSelected = targetType === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetType(t.id as any)}
                  className={`p-3 border text-left font-mono transition-all duration-75 ${
                    isSelected
                      ? 'bg-[#33ff00] text-black border-[#33ff00] font-bold shadow-[0_0_8px_rgba(51,255,0,0.4)]'
                      : 'bg-black text-[#33ff00] border-[#1f521f] hover:border-[#33ff00]/60 hover:bg-[#0d220d]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] ${isSelected ? 'text-black' : 'text-[#1f521f]'}`}>
                      [{t.code}]
                    </span>
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-[#33ff00]'}`} />
                  </div>
                  <div className="font-bold text-xs uppercase tracking-wider">
                    {isSelected ? `* ${t.label}` : t.label}
                  </div>
                  <div className={`text-[10px] mt-1 ${isSelected ? 'text-black/80' : 'text-[#94a3b8]'}`}>
                    {t.desc}
                  </div>
                </button>
              );
            })}
          </div>
        </TerminalPane>

        {/* Step 2: Target Path/URL Input */}
        <TerminalPane title="STEP_02: TARGET_SPECIFICATION" prefix="URI">
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="target-value-input" className="text-[#94a3b8] uppercase font-bold text-[11px]">
                  TARGET_PATH_OR_URI <span className="text-[#ff3333]">*</span>
                </label>
                {targetValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="text-[#ffb000] hover:underline text-[10px]"
                  >
                    [CLEAR_INPUT]
                  </button>
                )}
              </div>

              <div className="flex items-center bg-black border border-[#1f521f] focus-within:border-[#33ff00] px-2 py-1.5">
                <span className="text-[#1f521f] select-none mr-2 font-bold">&gt;&gt;</span>
                <input
                  id="target-value-input"
                  type="text"
                  value={targetValue}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  placeholder={targetTypes.find((t) => t.id === targetType)?.placeholder}
                  required
                  className="w-full bg-transparent text-[#33ff00] font-mono text-xs focus:outline-none placeholder:text-[#1f521f]"
                />
              </div>
              <p className="text-[10px] text-[#1f521f] mt-1">
                {targetType === 'local_project' && '// Mounts local repository or folder directly into isolated Strix assessment sandbox.'}
                {targetType === 'github_repo' && '// Clones public or authorized Git repository for deep code-level security analysis.'}
                {targetType === 'web_app' && '// Probes authorized web application endpoints for dynamic vulnerabilities.'}
                {targetType === 'api_spec' && '// Parses OpenAPI/Swagger specification file for API security audits.'}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="project-name-input" className="text-[#94a3b8] uppercase text-[11px]">
                  PROJECT_NAME_ALIAS (OPTIONAL)
                </label>
                {projectName && (
                  <button
                    type="button"
                    onClick={() => setProjectName('')}
                    className="text-[#94a3b8] hover:text-[#ff3333] text-[10px]"
                  >
                    [CLEAR]
                  </button>
                )}
              </div>
              <div className="flex items-center bg-black border border-[#1f521f] focus-within:border-[#33ff00] px-2 py-1">
                <span className="text-[#1f521f] select-none mr-2 font-bold">&gt;&gt;</span>
                <input
                  id="project-name-input"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g. AcmeBackend"
                  className="w-full bg-transparent text-[#33ff00] font-mono text-xs focus:outline-none placeholder:text-[#1f521f]"
                />
              </div>
            </div>
          </div>
        </TerminalPane>

        {/* Step 3: Scan Configuration */}
        <TerminalPane title="STEP_03: EXECUTION_PARAMETERS" prefix="OPT">
          <div className="space-y-3">
            {/* Scan Mode Switchers */}
            <div>
              <div className="text-[11px] text-[#94a3b8] uppercase mb-2 font-bold">SCAN_DEPTH_MODE:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  { id: 'quick', title: 'QUICK', desc: 'Surface check / CI gate' },
                  { id: 'standard', title: 'STANDARD', desc: 'Routine pentest pass' },
                  { id: 'deep', title: 'DEEP (RECOMMENDED)', desc: 'Exhaustive vulnerability discovery' },
                ].map((m) => {
                  const isSelected = scanMode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setScanMode(m.id as any)}
                      className={`p-2.5 border text-left font-mono transition-all duration-75 ${
                        isSelected
                          ? 'border-[#33ff00] bg-[#33ff00] text-black font-bold'
                          : 'border-[#1f521f] bg-black text-[#33ff00] hover:bg-[#0d220d]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs uppercase font-bold">
                          {isSelected ? `[*] ${m.title}` : `[ ] ${m.title}`}
                        </span>
                      </div>
                      <div className={`text-[10px] mt-1 ${isSelected ? 'text-black/80' : 'text-[#94a3b8]'}`}>
                        {m.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Instructions */}
            <div>
              <label htmlFor="custom-instructions-input" className="text-[11px] text-[#94a3b8] uppercase block mb-1 font-bold">
                OPERATIONAL_DIRECTIVES (INSTRUCTIONS_TO_AGENT):
              </label>
              <textarea
                id="custom-instructions-input"
                rows={2}
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Focus on IDOR, SQL injection, and authorization weaknesses."
                className="w-full bg-black border border-[#1f521f] text-[#33ff00] p-2 font-mono text-xs focus:outline-none focus:border-[#33ff00]"
              />
            </div>

            {/* Limits */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="max-budget-input" className="text-[11px] text-[#94a3b8] uppercase block mb-1">
                  MAX_BUDGET_USD (OPTIONAL)
                </label>
                <input
                  id="max-budget-input"
                  type="number"
                  step="0.5"
                  min="0"
                  value={maxBudget !== undefined ? maxBudget : ''}
                  onChange={(e) => setMaxBudget(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="UNLIMITED"
                  className="input-terminal w-full"
                />
              </div>
              <div>
                <label htmlFor="max-turns-input" className="text-[11px] text-[#94a3b8] uppercase block mb-1">
                  MAX_TURNS (OPTIONAL)
                </label>
                <input
                  id="max-turns-input"
                  type="number"
                  min="10"
                  max="1000"
                  value={maxTurns !== undefined ? maxTurns : ''}
                  onChange={(e) => setMaxTurns(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                  placeholder="DEFAULT: 500"
                  className="input-terminal w-full"
                />
              </div>
            </div>
          </div>
        </TerminalPane>

        {/* Step 4: CLI Preview */}
        <TerminalPane title="CLI_COMMAND_PREVIEW" prefix="PREVIEW">
          <div className="space-y-2">
            <div className="bg-[#050c05] border border-[#1f521f] p-2.5 font-mono text-xs text-[#33ff00] break-all select-all flex items-start justify-between">
              <span>{estimatedCommand}</span>
            </div>
            <p className="text-[10px] text-[#1f521f]">
              // Subprocess invoked with safe list parameters (shell=False) inside Docker container.
            </p>
          </div>
        </TerminalPane>

        {/* Step 5: Mandatory Legal Authorization */}
        <div className="border border-[#ffb000] bg-black p-3 space-y-2">
          <div className="flex items-center space-x-2 text-[#ffb000] font-bold text-xs uppercase amber-glow">
            <ShieldCheck className="w-4 h-4 shrink-0 text-[#ffb000]" />
            <span>LEGAL_AUTHORIZATION_CERTIFICATE</span>
          </div>
          <p className="text-[11px] text-[#94a3b8] leading-relaxed">
            "Only scan applications and systems that you own or have explicit authorization to test."
            Unauthorized security testing of external systems violates computer fraud statutes and terms of service.
          </p>
          <label htmlFor="auth-checkbox" className="flex items-center space-x-2 pt-1 cursor-pointer">
            <input
              id="auth-checkbox"
              type="checkbox"
              checked={authorized}
              onChange={(e) => setAuthorized(e.target.checked)}
              className="accent-[#33ff00] w-3.5 h-3.5 bg-black border-[#1f521f]"
            />
            <span className="text-xs text-[#33ff00] font-bold uppercase select-none">
              [X] I CERTIFY THAT I HAVE EXPLICIT LEGAL AUTHORIZATION TO ASSESS THIS TARGET.
            </span>
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end space-x-3 pt-2">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="btn-terminal"
          >
            [ ABORT / CANCEL ]
          </button>
          <button
            type="submit"
            disabled={!authorized || submitting}
            className={
              authorized && !submitting
                ? 'btn-terminal font-bold terminal-invert'
                : 'btn-terminal opacity-50 cursor-not-allowed border-[#1f521f] text-[#1f521f] bg-black'
            }
          >
            {submitting ? (
              <span>[ INITIALIZING_STRIX_DAEMON... ]</span>
            ) : (
              <span>[&gt; INITIATE_STRIX_ASSESSMENT]</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewScan;
