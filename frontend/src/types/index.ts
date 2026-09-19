/**
 * TypeScript interface definitions matching backend schemas.
 *
 * # TypeScript Interfaces — compile-time type contracts ensuring frontend code matches the shape of backend JSON responses.
 */

export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';

export type ScanStatus = 'Queued' | 'Starting' | 'Running' | 'Completed' | 'Failed' | 'Cancelled';

export type FindingStatus = 'Open' | 'Confirmed' | 'Fixed' | 'Accepted Risk' | 'Retest Required';

export type ProviderMode = 'AUTO' | 'GEMINI' | 'OLLAMA';

export interface Scan {
  id: string;
  project_id?: string;
  target_type: string;
  target_value: string;
  scan_mode: string;
  instruction?: string;
  max_budget?: number;
  max_turns?: number;
  status: ScanStatus;
  start_time?: string;
  end_time?: string;
  elapsed_seconds: number;
  strix_run_name?: string;
  provider_used: string;
  exit_code?: number;
  findings_count: number;
  critical_count: number;
  high_count: number;
  medium_count: number;
  low_count: number;
  info_count: number;
}

export interface FindingNote {
  id: string;
  author: string;
  content: string;
  created_at: string;
}

export interface RetestHistoryItem {
  id: string;
  original_scan_id: string;
  retest_scan_id?: string;
  previous_status: string;
  new_status: string;
  result: string;
  notes?: string;
  timestamp: string;
}

export interface Finding {
  id: string;
  scan_id: string;
  project_id?: string;
  target?: string;
  title: string;
  severity: SeverityLevel;
  category: string;
  description: string;
  location?: string;
  endpoint?: string;
  evidence?: string;
  impact?: string;
  recommendation?: string;
  status: FindingStatus;
  created_at: string;
  updated_at: string;
  notes?: FindingNote[];
  retests?: RetestHistoryItem[];
}

export interface ScanLog {
  id: number;
  scan_id: string;
  timestamp: string;
  level: string;
  message: string;
  source: string;
}

export interface AttackPathNode {
  id: string;
  label: string;
  node_type: 'entry_point' | 'vulnerability' | 'service' | 'endpoint' | 'resource';
  metadata?: Record<string, any>;
}

export interface AttackPathEdge {
  id: string;
  source: string;
  target: string;
  relation_type: string;
  evidence?: string;
}

export interface AttackPathGraph {
  scan_id: string;
  has_sufficient_evidence: boolean;
  notice?: string;
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
}

export interface ProviderStatus {
  active_provider: 'GEMINI' | 'OLLAMA';
  mode: ProviderMode;
  gemini_status: string;
  gemini_cooldown_remaining_seconds: number;
  gemini_last_error?: string;
  gemini_model: string;
  ollama_status: string;
  ollama_url: string;
  ollama_model: string;
  fallback_history: Array<{
    timestamp: string;
    reason: string;
    from_provider: string;
    to_provider: string;
    cooldown_seconds?: number;
  }>;
}

export interface DashboardMetrics {
  total_scans: number;
  active_scans: number;
  completed_scans: number;
  open_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  info_findings: number;
  recent_scans: Scan[];
  recent_findings: Finding[];
  projects_count: number;
  provider_status: ProviderStatus;
  docker_running: boolean;
  strix_available: boolean;
}

export interface EndpointItem {
  method: string;
  path: string;
  summary?: string;
  description?: string;
  authentication_required: boolean;
  auth_type?: string;
  parameters_count: number;
  findings_count: number;
  risk_level: 'Critical' | 'High' | 'Medium' | 'Low' | 'None';
}

export interface ApiSpecAnalysis {
  title: string;
  version: string;
  description?: string;
  total_endpoints: number;
  authenticated_endpoints: number;
  unauthenticated_endpoints: number;
  endpoints: EndpointItem[];
}

export interface ReportItem {
  id: string;
  scan_id: string;
  title: string;
  format: 'html' | 'pdf' | 'json';
  file_path: string;
  download_url: string;
  generated_at: string;
}

export interface TrainingLab {
  id: string;
  title: string;
  category: string;
  difficulty: string;
  description: string;
  target_type: string;
  default_target: string;
  recommended_mode: string;
  instruction: string;
  authorization_notice: string;
}

export interface SystemSettings {
  app_name: string;
  app_version: string;
  strix_executable_path: string;
  strix_available: boolean;
  strix_version: string;
  docker_running: boolean;
  docker_status_text: string;
  database_url: string;
  reports_dir: string;
  scans_run_dir: string;
  llm_provider_mode: string;
  gemini_api_key_status: string;
  gemini_model: string;
  ollama_url: string;
  ollama_model: string;
  default_scan_mode?: string;
  default_max_budget?: number;
  default_max_turns?: number;
}
