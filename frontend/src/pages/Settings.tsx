import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Cpu,
  Layers,
  Database,
  FileText,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Save,
  AlertCircle,
} from 'lucide-react';
import { SystemSettings, ProviderMode } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SkeletonCard } from '../components/LoadingSkeleton';

export const Settings: React.FC = () => {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ProviderMode>('AUTO');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [strixPath, setStrixPath] = useState('');
  const [defaultScanMode, setDefaultScanMode] = useState('deep');
  const [defaultMaxBudget, setDefaultMaxBudget] = useState<number | undefined>(undefined);
  const [defaultMaxTurns, setDefaultMaxTurns] = useState<number | undefined>(undefined);
  const [reportsDir, setReportsDir] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingScanDefaults, setSavingScanDefaults] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setMode(data.llm_provider_mode as ProviderMode);
      setOllamaUrl(data.ollama_url);
      setOllamaModel(data.ollama_model);
      setStrixPath(data.strix_executable_path || '');
      setDefaultScanMode(data.default_scan_mode || 'deep');
      setDefaultMaxBudget(data.default_max_budget);
      setDefaultMaxTurns(data.default_max_turns);
      setReportsDir(data.reports_dir || '');
    } catch (err: any) {
      console.error('Failed to load settings:', err);
      addToast(err.message || 'Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveScanDefaults = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingScanDefaults(true);
      await api.updateSettings({
        strix_executable_path: strixPath.trim() || undefined,
        default_scan_mode: defaultScanMode,
        default_max_budget: defaultMaxBudget,
        default_max_turns: defaultMaxTurns,
        reports_dir: reportsDir.trim() || undefined,
      });
      setSaveSuccess(true);
      addToast('Scan execution defaults updated successfully', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettings();
    } catch (err: any) {
      addToast(err.message || 'Failed to update scan defaults', 'error');
    } finally {
      setSavingScanDefaults(false);
    }
  };

  const handleSaveProviders = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProviderMode(mode, ollamaUrl, ollamaModel);
      setSaveSuccess(true);
      addToast('LLM provider failover settings saved', 'success');
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettings();
    } catch (err: any) {
      addToast(err.message || 'Failed to update LLM provider settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <SkeletonCard height="h-24" />
        <SkeletonCard height="h-48" />
        <SkeletonCard height="h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-blue-400" />
          System Settings & Environment Telemetry
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Verify Strix CLI installation, Docker sandbox readiness, database location, and LLM failover parameters.
        </p>
      </div>

      {saveSuccess && (
        <div role="status" className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Settings updated successfully.
        </div>
      )}

      {/* Infrastructure Readiness Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strix Engine Card */}
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-400" />
              Strix Engine Installation
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                settings?.strix_available
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              {settings?.strix_available ? 'Detected' : 'Not Found'}
            </span>
          </div>

          <div className="text-xs space-y-1.5 font-mono">
            <div className="text-gray-400">
              Binary Path:{' '}
              <span className="text-gray-200 break-all">{settings?.strix_executable_path}</span>
            </div>
            <div className="text-gray-400">
              Engine Version: <span className="text-blue-400 font-bold">{settings?.strix_version}</span>
            </div>
          </div>
        </div>

        {/* Docker Sandbox Card */}
        <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Docker Sandbox Daemon
            </h3>
            <span
              className={`px-2 py-0.5 rounded text-xs font-semibold ${
                settings?.docker_running
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-red-950 text-red-400 border border-red-800'
              }`}
            >
              {settings?.docker_status_text}
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed">
            Strix spins up isolated container sandboxes (<code>ghcr.io/usestrix/strix-sandbox:1.3.0</code>) to safely execute commands, run tools, and isolate testing operations from your host.
          </p>
        </div>
      </div>

      {/* Scan Execution Defaults & Engine Paths */}
      <form onSubmit={handleSaveScanDefaults} className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-blue-400" />
          Scan Execution & Engine Defaults
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label htmlFor="settings-strix-path" className="text-gray-400 block mb-1 font-semibold">
              Custom Strix Binary Path
            </label>
            <input
              id="settings-strix-path"
              type="text"
              value={strixPath}
              onChange={(e) => setStrixPath(e.target.value)}
              placeholder="C:\Users\...\Scripts\strix.exe or strix"
              className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="settings-default-mode" className="text-gray-400 block mb-1 font-semibold">
                Default Scan Mode
              </label>
              <select
                id="settings-default-mode"
                value={defaultScanMode}
                onChange={(e) => setDefaultScanMode(e.target.value)}
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
              >
                <option value="quick">Quick (CI/CD)</option>
                <option value="standard">Standard</option>
                <option value="deep">Deep (Exhaustive)</option>
              </select>
            </div>

            <div>
              <label htmlFor="settings-default-budget" className="text-gray-400 block mb-1 font-semibold">
                Default Max Budget (USD)
              </label>
              <input
                id="settings-default-budget"
                type="number"
                step="0.5"
                min="0"
                value={defaultMaxBudget !== undefined ? defaultMaxBudget : ''}
                onChange={(e) => setDefaultMaxBudget(e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="Unlimited"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="settings-default-turns" className="text-gray-400 block mb-1 font-semibold">
                Default Max Turns
              </label>
              <input
                id="settings-default-turns"
                type="number"
                min="10"
                max="1000"
                value={defaultMaxTurns !== undefined ? defaultMaxTurns : ''}
                onChange={(e) => setDefaultMaxTurns(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="500"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="settings-reports-dir" className="text-gray-400 block mb-1 font-semibold">
              Reports Output Directory
            </label>
            <input
              id="settings-reports-dir"
              type="text"
              value={reportsDir}
              onChange={(e) => setReportsDir(e.target.value)}
              placeholder="reports/"
              className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={savingScanDefaults}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Save className="w-4 h-4" />
            {savingScanDefaults ? 'Saving...' : 'Save Scan Defaults'}
          </button>
        </div>
      </form>

      {/* LLM Provider Configuration Form */}
      <form onSubmit={handleSaveProviders} className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          LLM Provider Failover Configuration
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label htmlFor="settings-provider-mode" className="text-gray-400 block mb-1 font-semibold">
              Active Provider Mode
            </label>
            <select
              id="settings-provider-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as ProviderMode)}
              className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="AUTO">AUTO (Primary: Google Gemini, Fallback: Local Ollama on 429/errors)</option>
              <option value="GEMINI">GEMINI (Strict Gemini Mode)</option>
              <option value="OLLAMA">OLLAMA (Local Offline Mode)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="gemini-key-status" className="text-gray-400 block mb-1">Google Gemini API Key Status</label>
              <input
                id="gemini-key-status"
                type="text"
                disabled
                value={settings?.gemini_api_key_status || 'Not Configured'}
                className="w-full bg-[#0d121c] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-emerald-400 font-semibold cursor-not-allowed"
              />
              <span className="text-[10px] text-gray-500 mt-1 block">
                Keys are never revealed for defense-in-depth secret protection.
              </span>
            </div>

            <div>
              <label htmlFor="gemini-model-name" className="text-gray-400 block mb-1">Google Gemini Model</label>
              <input
                id="gemini-model-name"
                type="text"
                disabled
                value={settings?.gemini_model || 'gemini-2.5-flash'}
                className="w-full bg-[#0d121c] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="settings-ollama-url" className="text-gray-400 block mb-1">Ollama Local Server URL</label>
              <input
                id="settings-ollama-url"
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="settings-ollama-model" className="text-gray-400 block mb-1">Ollama Fallback Model</label>
              <input
                id="settings-ollama-model"
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="llama3.2 or deepseek-r1"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </form>

      {/* Storage & Database Diagnostics */}
      <div className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-3">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" />
          Persistence & Directory Layout
        </h3>

        <div className="text-xs space-y-2 font-mono text-gray-400">
          <div>
            Database String: <span className="text-gray-200">{settings?.database_url}</span>
          </div>
          <div>
            Reports Directory: <span className="text-gray-200">{settings?.reports_dir}</span>
          </div>
          <div>
            Strix Runs Folder: <span className="text-gray-200">{settings?.scans_run_dir}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
