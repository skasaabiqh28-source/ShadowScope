import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  Upload,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Shield,
  Layers,
  Info,
  X,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { ApiSpecAnalysis, EndpointItem } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface Props {
  onNavigate: (route: string, param?: string) => void;
}

export const ApiSecurity: React.FC<Props> = ({ onNavigate }) => {
  const { addToast } = useToast();
  const [analysis, setAnalysis] = useState<ApiSpecAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [targetBaseUrl, setTargetBaseUrl] = useState('http://localhost:8000');
  const [rawText, setRawText] = useState('');
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointItem | null>(null);

  useEffect(() => {
    if (selectedEndpoint) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSelectedEndpoint(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedEndpoint]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.uploadApiSpec(file);
      setAnalysis(res);
      addToast(`Parsed ${res.total_endpoints} API endpoints successfully`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to parse API specification.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const res = await api.parseRawApiSpec(rawText.trim(), rawText.trim().startsWith('{') ? 'json' : 'yaml');
      setAnalysis(res);
      addToast(`Parsed ${res.total_endpoints} API endpoints successfully`, 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to parse raw specification.';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleScanApi = () => {
    if (!targetBaseUrl.trim()) {
      addToast('Please specify the API base URL to test against.', 'warning');
      return;
    }
    try {
      sessionStorage.setItem('prefill_scan_target', targetBaseUrl.trim());
      sessionStorage.setItem('prefill_scan_type', 'web_app');
      sessionStorage.setItem('prefill_scan_instruction', `Perform comprehensive security testing on API base ${targetBaseUrl.trim()} across all endpoints. Test for BOLA/IDOR, broken authentication, excessive data exposure, and input flaws.`);
    } catch (e) {
      // ignore
    }
    onNavigate('new-scan');
  };

  const handleScanSpecificEndpoint = (ep: EndpointItem) => {
    const fullUrl = `${targetBaseUrl.replace(/\/+$/, '')}/${ep.path.replace(/^\/+/, '')}`;
    try {
      sessionStorage.setItem('prefill_scan_target', fullUrl);
      sessionStorage.setItem('prefill_scan_type', 'web_app');
      sessionStorage.setItem('prefill_scan_instruction', `Perform security penetration testing specifically on endpoint ${ep.method} ${ep.path}. Test for authorization bypass, input validation flaws, and data disclosure.`);
    } catch (e) {
      // ignore storage errors
    }
    onNavigate('new-scan');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            <FileCode2 className="w-5 h-5 text-blue-400" />
            API Security Analyzer (OpenAPI / Swagger)
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Inspect REST API specifications, uncover unauthenticated attack surfaces, and run Strix API tests.
          </p>
        </div>

        {analysis && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0b0f19] border border-[#1d273a] px-3 py-1.5 rounded-lg">
              <label htmlFor="target-base-url-input" className="text-xs text-gray-400">Target Host:</label>
              <input
                id="target-base-url-input"
                type="text"
                value={targetBaseUrl}
                onChange={(e) => setTargetBaseUrl(e.target.value)}
                placeholder="http://localhost:8000"
                className="bg-transparent text-xs text-blue-300 font-mono focus:outline-none w-44"
              />
            </div>
            <button
              onClick={handleScanApi}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Play className="w-4 h-4 fill-current" />
              Scan All Endpoints
            </button>
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="p-4 bg-red-950/30 border border-red-800/50 rounded-lg text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Input Options (Upload or Paste) */}
      {!analysis && (
        <div className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
          <div className="flex gap-4 border-b border-[#1d273a] pb-3 text-xs font-medium">
            <button
              onClick={() => setInputMode('upload')}
              className={`pb-1 ${
                inputMode === 'upload' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Upload Spec (.json / .yaml)
            </button>
            <button
              onClick={() => setInputMode('paste')}
              className={`pb-1 ${
                inputMode === 'paste' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              Paste Raw Specification
            </button>
          </div>

          {inputMode === 'upload' ? (
            <div className="border-2 border-dashed border-[#232f44] hover:border-blue-500/50 rounded-xl p-12 text-center transition-colors bg-[#0d121c]">
              <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <div className="text-sm font-semibold text-gray-200">
                Upload your OpenAPI 3.0 or Swagger 2.0 file
              </div>
              <p className="text-xs text-gray-500 mt-1">Accepts .json, .yaml, or .yml</p>
              <label className="mt-4 inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer transition-colors focus-within:ring-2 focus-within:ring-blue-500">
                <span>Select Specification File</span>
                <input
                  type="file"
                  accept=".json,.yaml,.yml"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          ) : (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <label htmlFor="raw-spec-textarea" className="sr-only">Paste specification</label>
              <textarea
                id="raw-spec-textarea"
                rows={8}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste OpenAPI / Swagger JSON or YAML here..."
                className="w-full bg-[#0d121c] border border-[#232f44] rounded-lg p-3 text-xs text-gray-100 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={loading || !rawText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {loading ? 'Parsing...' : 'Analyze API Specification'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Analysis Results View */}
      {analysis && (
        <div className="space-y-6">
          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Total Endpoints</div>
              <div className="text-2xl font-bold text-gray-100 mt-1">{analysis.total_endpoints}</div>
            </div>

            <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
              <div className="text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Authenticated
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                {analysis.authenticated_endpoints}
              </div>
            </div>

            <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
              <div className="text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Unlock className="w-3.5 h-3.5" /> Unauthenticated
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1">
                {analysis.unauthenticated_endpoints}
              </div>
            </div>

            <div className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg">
              <div className="text-xs text-blue-400 uppercase tracking-wider">API Version</div>
              <div className="text-xl font-bold font-mono text-gray-200 mt-1">{analysis.version}</div>
            </div>
          </div>

          {/* Endpoints Table */}
          <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-[#1d273a] flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold text-gray-200">{analysis.title}</h3>
                {analysis.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{analysis.description}</p>
                )}
              </div>
              <button
                onClick={() => setAnalysis(null)}
                className="text-xs text-gray-400 hover:text-gray-200"
              >
                Upload Different Spec
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0e1320] text-gray-400 border-b border-[#1d273a]">
                  <tr>
                    <th scope="col" className="py-3 px-4">Method</th>
                    <th scope="col" className="py-3 px-4">Path</th>
                    <th scope="col" className="py-3 px-4">Authentication</th>
                    <th scope="col" className="py-3 px-4">Parameters</th>
                    <th scope="col" className="py-3 px-4">Findings</th>
                    <th scope="col" className="py-3 px-4">Risk Indicator</th>
                    <th scope="col" className="py-3 px-4">Status</th>
                    <th scope="col" className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1d273a] text-gray-300">
                  {analysis.endpoints.map((ep, idx) => {
                    let methodBadge = 'bg-blue-950 text-blue-400 border-blue-800';
                    if (ep.method === 'POST') methodBadge = 'bg-emerald-950 text-emerald-400 border-emerald-800';
                    else if (ep.method === 'DELETE') methodBadge = 'bg-red-950 text-red-400 border-red-800';
                    else if (ep.method === 'PUT' || ep.method === 'PATCH') methodBadge = 'bg-amber-950 text-amber-400 border-amber-800';

                    return (
                      <tr
                        key={idx}
                        onClick={() => setSelectedEndpoint(ep)}
                        className="hover:bg-[#151c2d] cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${methodBadge}`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-200">
                          {ep.path}
                          {ep.summary && <div className="text-[11px] text-gray-500 font-sans mt-0.5">{ep.summary}</div>}
                        </td>
                        <td className="py-3 px-4">
                          {ep.authentication_required ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-[11px]">
                              <Lock className="w-3 h-3" /> Auth Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                              <Unlock className="w-3 h-3" /> Public / No Auth
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-gray-400">{ep.parameters_count} param(s)</td>
                        <td className="py-3 px-4">
                          {ep.findings_count > 0 ? (
                            <span className="px-2 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded font-semibold text-[11px]">
                              {ep.findings_count} finding(s)
                            </span>
                          ) : (
                            <span className="text-gray-500 text-[11px]">0 findings</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                              ep.risk_level === 'Critical' || ep.risk_level === 'High'
                                ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                                : ep.risk_level === 'Medium'
                                ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                : 'bg-slate-900 text-slate-400 border border-slate-800'
                            }`}
                          >
                            {ep.risk_level} Risk
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                            <CheckCircle2 className="w-3 h-3" /> Ready
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEndpoint(ep);
                            }}
                            className="text-xs text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                          >
                            Inspect <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Endpoint Details Accessible Modal */}
      {selectedEndpoint && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="endpoint-details-title"
        >
          <div className="bg-[#111726] border border-[#1d273a] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-blue-400">
                  {selectedEndpoint.method}
                </span>
                <h3 id="endpoint-details-title" className="text-base font-bold text-gray-100 font-mono mt-0.5 break-all">
                  {selectedEndpoint.path}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEndpoint(null)}
                aria-label="Close dialog"
                className="text-gray-400 hover:text-gray-200 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedEndpoint.summary && (
              <p className="text-xs text-gray-300">{selectedEndpoint.summary}</p>
            )}

            {selectedEndpoint.description && (
              <div className="text-xs text-gray-400 bg-[#0c101a] p-3 rounded border border-[#1d273a]">
                {selectedEndpoint.description}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#0c101a] p-3 rounded border border-[#1d273a]">
                <div className="text-gray-500">Authentication</div>
                <div className="font-semibold text-gray-200 mt-1 flex items-center gap-1.5">
                  {selectedEndpoint.authentication_required ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{selectedEndpoint.auth_type || 'Bearer / API Key Required'}</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Public / Unauthenticated</span>
                    </>
                  )}
                </div>
              </div>

              <div className="bg-[#0c101a] p-3 rounded border border-[#1d273a]">
                <div className="text-gray-500">Parameters</div>
                <div className="font-semibold text-gray-200 mt-1">
                  {selectedEndpoint.parameters_count} parameter(s) documented
                </div>
              </div>

              <div className="bg-[#0c101a] p-3 rounded border border-[#1d273a]">
                <div className="text-gray-500">Risk Assessment</div>
                <div className="font-semibold text-gray-200 mt-1">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      selectedEndpoint.risk_level === 'Critical' || selectedEndpoint.risk_level === 'High'
                        ? 'bg-red-950/60 text-red-400 border border-red-800/40'
                        : selectedEndpoint.risk_level === 'Medium'
                        ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {selectedEndpoint.risk_level} Risk
                  </span>
                </div>
              </div>

              <div className="bg-[#0c101a] p-3 rounded border border-[#1d273a]">
                <div className="text-gray-500">Known Findings</div>
                <div className="font-semibold text-gray-200 mt-1">
                  {selectedEndpoint.findings_count} vulnerability flag(s)
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-[#1d273a]">
              <button
                onClick={() => setSelectedEndpoint(null)}
                className="px-4 py-2 border border-[#1d273a] hover:bg-[#151c2d] text-gray-300 text-xs font-medium rounded-lg transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleScanSpecificEndpoint(selectedEndpoint)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors shadow-lg shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Launch Target Scan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
