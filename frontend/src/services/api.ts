/**
 * Centralized API Service for communicating with the FastAPI backend.
 *
 * # Fetch API — the browser's built-in asynchronous HTTP request mechanism.
 * # Centralized Client — organizing all backend communications into a single module for reusability and error handling.
 */

import {
  DashboardMetrics,
  Scan,
  Finding,
  ScanLog,
  AttackPathGraph,
  ApiSpecAnalysis,
  ReportItem,
  TrainingLab,
  SystemSettings,
  ProviderStatus,
  ProviderMode,
} from '../types';

const API_BASE = '/api';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await response.json();
      errorDetail = errJson.detail || errJson.message || errorDetail;
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Dashboard
  getDashboardMetrics: () => request<DashboardMetrics>('/dashboard'),

  // Scans
  listScans: (params?: { project_id?: string; status_filter?: string }) => {
    const q = new URLSearchParams();
    if (params?.project_id) q.set('project_id', params.project_id);
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    const qs = q.toString();
    return request<Scan[]>(`/scans${qs ? `?${qs}` : ''}`);
  },

  createScan: (data: {
    target_type: string;
    target_value: string;
    scan_mode: string;
    instruction?: string;
    max_budget?: number;
    max_turns?: number;
    authorization_acknowledged: boolean;
    project_name?: string;
  }) => request<Scan>('/scans', { method: 'POST', body: JSON.stringify(data) }),

  getScan: (id: string) => request<Scan>(`/scans/${id}`),

  cancelScan: (id: string) => request<{ message: string; cancelled: boolean }>(`/scans/${id}/cancel`, { method: 'POST' }),

  getScanLogs: (id: string) => request<ScanLog[]>(`/scans/${id}/logs`),

  compareScans: (scan1Id: string, scan2Id: string) =>
    request<any>(`/scans/compare/${scan1Id}/${scan2Id}`),

  // Findings
  listFindings: (params?: {
    scan_id?: string;
    severity?: string;
    status_filter?: string;
    category?: string;
    search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.scan_id) q.set('scan_id', params.scan_id);
    if (params?.severity) q.set('severity', params.severity);
    if (params?.status_filter) q.set('status_filter', params.status_filter);
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return request<Finding[]>(`/findings${qs ? `?${qs}` : ''}`);
  },

  getFinding: (id: string) => request<Finding>(`/findings/${id}`),

  updateFindingStatus: (id: string, status: string, note?: string) =>
    request<Finding>(`/findings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    }),

  addFindingNote: (id: string, content: string, author?: string) =>
    request<any>(`/findings/${id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, author }),
    }),

  retestFinding: (id: string, instruction?: string, scan_mode: string = 'quick') =>
    request<any>(`/findings/${id}/retest`, {
      method: 'POST',
      body: JSON.stringify({ instruction, scan_mode }),
    }),

  // Attack Paths
  getAttackPathGraph: (scanId: string) => request<AttackPathGraph>(`/attack-paths/${scanId}`),

  // API Security
  uploadApiSpec: async (file: File): Promise<ApiSpecAnalysis> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api-security/parse-file`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to parse file' }));
      throw new Error(err.detail || 'Failed to parse API spec');
    }
    return res.json();
  },

  parseRawApiSpec: (rawSpec: string, format: string = 'json') =>
    request<ApiSpecAnalysis>('/api-security/parse-raw', {
      method: 'POST',
      body: JSON.stringify({ raw_spec: rawSpec, format }),
    }),

  // Reports
  listReports: (scanId?: string) => {
    const url = scanId ? `/reports?scan_id=${scanId}` : '/reports';
    return request<ReportItem[]>(url);
  },

  generateReport: (scanId: string, format: string = 'html', title?: string) =>
    request<ReportItem>('/reports', {
      method: 'POST',
      body: JSON.stringify({ scan_id: scanId, format, title }),
    }),

  // AI Security Assistant
  askAssistant: (query: string, findingId?: string, scanId?: string) =>
    request<{ answer: string; provider_used: string; grounded_in_data: boolean; disclaimer?: string }>(
      '/assistant/chat',
      {
        method: 'POST',
        body: JSON.stringify({ query, finding_id: findingId, scan_id: scanId }),
      }
    ),

  deleteScan: (id: string) => request<{ message: string; scan_id: string }>(`/scans/${id}`, { method: 'DELETE' }),

  retestScan: (id: string, instruction?: string, scan_mode?: string) =>
    request<Scan>(`/scans/${id}/retest`, {
      method: 'POST',
      body: JSON.stringify({ instruction, scan_mode }),
    }),

  // Projects
  listProjects: () => request<any[]>('/projects'),
  getProject: (id: string) => request<any>(`/projects/${id}`),
  createProject: (data: { name: string; target_type: string; target_value: string; description?: string }) =>
    request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),

  // Training Labs
  listTrainingLabs: () => request<TrainingLab[]>('/labs'),

  launchLabScan: (labId: string, customTarget?: string, scanMode?: string) =>
    request<Scan>(`/labs/${labId}/launch`, {
      method: 'POST',
      body: JSON.stringify({ custom_target: customTarget, scan_mode: scanMode }),
    }),

  // LLM Provider Management
  getProviderStatus: () => request<ProviderStatus>('/provider/status'),

  updateProviderMode: (mode: ProviderMode, ollamaUrl?: string, ollamaModel?: string) =>
    request<ProviderStatus>('/provider/mode', {
      method: 'POST',
      body: JSON.stringify({ mode, ollama_url: ollamaUrl, ollama_model: ollamaModel }),
    }),

  resetGeminiCooldown: () => request<ProviderStatus>('/provider/reset-cooldown', { method: 'POST' }),

  // System Settings
  getSettings: () => request<SystemSettings>('/settings'),

  updateSettings: (data: Partial<SystemSettings>) =>
    request<SystemSettings>('/settings', { method: 'PATCH', body: JSON.stringify(data) }),

  // Attack Path Manual Edge
  addAttackPathEdge: (scanId: string, sourceId: string, targetId: string, relationType = 'chains_to', evidence?: string) =>
    request<{ message: string; edge_id: string }>(`/attack-paths/${scanId}/edges`, {
      method: 'POST',
      body: JSON.stringify({ source_id: sourceId, target_id: targetId, relation_type: relationType, evidence }),
    }),

  getReport: (id: string) => request<ReportItem>(`/reports/${id}`),
};
