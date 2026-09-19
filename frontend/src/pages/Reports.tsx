import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  CheckCircle2,
  RefreshCw,
  FileCode,
  FileType,
} from 'lucide-react';
import { ReportItem, Scan } from '../types';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { SkeletonTable } from '../components/LoadingSkeleton';
import { EmptyState } from '../components/EmptyState';

interface Props {
  initialScanId?: string;
  onNavigate: (route: string, param?: string) => void;
}

export const Reports: React.FC<Props> = ({ initialScanId, onNavigate }) => {
  const { addToast } = useToast();
  const [scans, setScans] = useState<Scan[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string>(initialScanId || '');
  const [selectedFormat, setSelectedFormat] = useState<'html' | 'pdf' | 'json'>('html');
  const [reportTitle, setReportTitle] = useState('');
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const scanList = await api.listScans();
      setScans(scanList);
      if (!selectedScanId && scanList.length > 0) {
        setSelectedScanId(scanList[0].id);
      }

      const repList = await api.listReports();
      setReports(repList);
    } catch (err: any) {
      console.error('Failed to load reports data:', err);
      addToast(err.message || 'Failed to load reports', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedScanId) {
      addToast('Please select a target scan for report compilation.', 'warning');
      return;
    }

    try {
      setGenerating(true);
      const newRep = await api.generateReport(
        selectedScanId,
        selectedFormat,
        reportTitle.trim() || undefined
      );
      setReports([newRep, ...reports]);
      addToast(`Security report generated successfully in ${selectedFormat.toUpperCase()} format!`, 'success');
      setReportTitle('');
    } catch (err: any) {
      addToast(err.message || 'Failed to generate report.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#111726] border border-[#1d273a] p-5 rounded-xl">
        <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-400" />
          Security Audit Reports
        </h2>
        <p className="text-sm text-gray-400 mt-1">
          Export formal HTML, publication-ready PDF, or machine-readable JSON security assessment reports.
        </p>
      </div>

      {/* Generator Card */}
      <form onSubmit={handleGenerate} className="bg-[#111726] border border-[#1d273a] p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-semibold text-gray-200">Generate New Report</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="report-target-scan" className="text-xs text-gray-400 block mb-1 font-medium">
              Target Scan
            </label>
            <select
              id="report-target-scan"
              value={selectedScanId}
              onChange={(e) => setSelectedScanId(e.target.value)}
              className="w-full bg-[#151c2a] border border-[#222c3d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
            >
              {scans.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.strix_run_name || s.id.slice(0, 8)} — {s.target_value} ({s.findings_count} findings)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="report-format-select" className="text-xs text-gray-400 block mb-1 font-medium">
              Report Format
            </label>
            <select
              id="report-format-select"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value as any)}
              className="w-full bg-[#151c2a] border border-[#222c3d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            >
              <option value="html">Interactive HTML Report</option>
              <option value="pdf">Formal PDF Document (ReportLab)</option>
              <option value="json">Machine-Readable JSON Audit</option>
            </select>
          </div>

          <div>
            <label htmlFor="report-title-input" className="text-xs text-gray-400 block mb-1 font-medium">
              Custom Title (Optional)
            </label>
            <input
              id="report-title-input"
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="e.g. SignBridgeAI Q3 Penetration Test"
              className="w-full bg-[#151c2a] border border-[#222c3d] rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={generating || !selectedScanId}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors shadow-md shadow-blue-600/20 focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {generating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Compiling Report...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Generate {selectedFormat.toUpperCase()} Report
              </>
            )}
          </button>
        </div>
      </form>

      {/* Generated Reports Table */}
      <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#1d273a] flex justify-between items-center">
          <h3 className="text-sm font-semibold text-gray-200">Generated Reports Archive</h3>
          <span className="text-xs text-gray-400">{reports.length} report(s)</span>
        </div>

        {loading ? (
          <SkeletonTable rows={4} cols={4} />
        ) : reports.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0e1320] text-gray-400 border-b border-[#1d273a]">
                <tr>
                  <th scope="col" className="py-3 px-4">Title</th>
                  <th scope="col" className="py-3 px-4">Format</th>
                  <th scope="col" className="py-3 px-4">Generated Date</th>
                  <th scope="col" className="py-3 px-4 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1d273a] text-gray-300">
                {reports.map((r) => (
                  <tr key={r.id} className="hover:bg-[#151c2d] transition-colors">
                    <td className="py-3 px-4 font-semibold text-gray-200">{r.title}</td>
                    <td className="py-3 px-4 uppercase text-[11px] font-mono text-blue-400">
                      {r.format}
                    </td>
                    <td className="py-3 px-4 text-gray-400">
                      {new Date(r.generated_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={r.download_url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Download ${r.title} in ${r.format.toUpperCase()} format`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-[#1a2333] hover:bg-[#232f44] border border-[#2b3952] rounded text-blue-400 hover:text-blue-300 font-medium transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Download
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={FileText}
              title="No Reports Generated Yet"
              description="Compile an assessment report using the form above to produce downloadable HTML, PDF, or JSON artifacts."
              actionLabel="Select a Scan to Report"
              onAction={() => {
                const target = document.getElementById('report-target-scan');
                target?.focus();
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
