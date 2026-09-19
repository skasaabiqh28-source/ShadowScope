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

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ProviderMode>('AUTO');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('llama3.2');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data);
      setMode(data.llm_provider_mode as ProviderMode);
      setOllamaUrl(data.ollama_url);
      setOllamaModel(data.ollama_model);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveProviders = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      await api.updateProviderMode(mode, ollamaUrl, ollamaModel);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      await loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !settings) {
    return (
      <div className="flex items-center justify-center h-96 text-gray-400">
        <RefreshCw className="w-6 h-6 animate-spin mr-2 text-blue-500" />
        <span>Loading system settings...</span>
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
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
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

      {/* LLM Provider Configuration Form */}
      <form onSubmit={handleSaveProviders} className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-gray-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          LLM Provider Failover Configuration
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-gray-400 block mb-1 font-semibold">Active Provider Mode</label>
            <select
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
              <label className="text-gray-400 block mb-1">Google Gemini API Key Status</label>
              <input
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
              <label className="text-gray-400 block mb-1">Google Gemini Model</label>
              <input
                type="text"
                disabled
                value={settings?.gemini_model || 'gemini-3.8-flash'}
                className="w-full bg-[#0d121c] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 block mb-1">Ollama Local Server URL</label>
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full bg-[#141b29] border border-[#222d42] rounded-lg px-3 py-2 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-gray-400 block mb-1">Ollama Fallback Model</label>
              <input
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
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow-md shadow-blue-600/20"
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
