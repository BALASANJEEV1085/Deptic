import { createClient } from './supabase/client';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';

export interface Component {
  id: string;
  scan_id: string;
  name: string;
  version: string;
  version_spec: string;
  license: string;
  ecosystem: string;
  depth: number;
  parent_name: string;
  source_path: string;
  created_at: string;
}

export interface Scan {
  id: string;
  project_id: string;
  status: 'running' | 'done' | 'failed';
  created_at: string;
  repo_url?: string;
  repo_name?: string;
  ecosystem?: string;
  ntia_score?: number;
  component_count?: number;
  critical_cves?: number;
  high_cves?: number;
  medium_cves?: number;
  low_cves?: number;
}

export interface Project {
  latest_scan_id: string;
  repo_url: string;
  repo_name: string;
  ecosystem: string;
  status: 'running' | 'done' | 'failed';
  created_at: string;
  ntia_score: number;
  component_count: number;
  critical_cves: number;
  high_cves: number;
  medium_cves: number;
  low_cves: number;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string;
  private: boolean;
}

export interface DashboardStats {
  total_projects: number;
  total_scans: number;
  total_components: number;
  critical_cves: number;
  high_cves: number;
  medium_cves: number;
  low_cves: number;
  ntia_compliant_scans: number;
  non_compliant_scans: number;
  clean_projects: number;
  recent_scans: {
    id: string;
    repo_name: string;
    ecosystem: string;
    status: 'running' | 'done' | 'failed';
    component_count: number;
    critical_cves: number;
    ntia_score: number;
    created_at: string;
  }[];
}

export interface GetScanResponse {
  scan: Scan;
  components: Component[];
  total: number;
  ecosystems: string[];
  ecosystem_breakdown: Record<string, { count: number; direct: number; transitive: number }>;
  manifest_files: { path: string; ecosystem: string }[];
  is_owner?: boolean;
}

export interface StartScanResponse {
  scan_id: string;
  status: string;
}

// ── Workspace types ────────────────────────────────────────────────────────
export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  plan: string;
  logo_url?: string;
  created_at: string;
  role?: string;        // current user's role in this workspace
  member_count?: number;
}

export interface WorkspaceMember {
  user_id: string;
  email: string;
  full_name: string;
  role: string;
  joined_at: string;
}

export interface WorkspaceInvitation {
  id: string;
  email: string;
  role: string;
  invited_by: string;
  expires_at: string;
  created_at: string;
}

async function getAuthHeaders() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error('No authenticated session found');
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  };

  if (typeof window !== 'undefined') {
    const wsID = localStorage.getItem('sbom_active_workspace_id');
    if (wsID) {
      headers['X-Workspace-ID'] = wsID;
    }
  }

  return headers;
}

export async function startScan(githubUrl: string, projectId: string): Promise<StartScanResponse> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_URL}/scans`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      github_url: githubUrl,
      project_id: projectId
    })
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to start scan');
  }
  
  return response.json();
}

export async function resolveAuditId(auditId: string): Promise<{ scan_id: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/audit/${auditId}`, { headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to resolve Audit ID');
  }
  return response.json();
}

export async function getScan(scanId: string): Promise<GetScanResponse> {
  const headers = await getAuthHeaders();
  
  const response = await fetch(`${API_URL}/scans/${scanId}`, {
    headers
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to fetch scan results');
  }
  
  return response.json();
}

export async function listScans(): Promise<{ scans: Scan[], total: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans`, { headers });
  
  if (!response.ok) {
    throw new Error('Failed to fetch scans');
  }
  return response.json();
}

export async function listProjects(): Promise<{ projects: Project[], total: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/projects`, { headers });
  if (!response.ok) throw new Error('Failed to fetch projects');
  return response.json();
}

// ── Shared UI Helpers ────────────────────────────────────────────────────────

export function shortId(id: string): string {
  return id.slice(0, 8);
}

export function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ecosystemLabel(eco: string | undefined, status?: string): string {
  if (!eco || eco === '' || eco.toLowerCase() === 'unknown') {
    if (status === 'running') return 'Detecting...';
    return 'Unknown';
  }
  return eco.toLowerCase();
}

export function ecosystemColorClass(eco: string | undefined): string {
  switch ((eco || '').toLowerCase()) {
    case 'npm':    return 'bg-blue-500/15 text-blue-400 border-blue-500/20';
    case 'pip':    return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20';
    case 'maven':  return 'bg-orange-500/15 text-orange-400 border-orange-500/20';
    default:       return 'bg-zinc-800/60 text-zinc-500 border-zinc-700/40';
  }
}

export function ntiaScoreColor(score: number): string {
  if (score === 100) return 'text-emerald-400';
  if (score >= 60)   return 'text-orange-400';
  return 'text-red-400';
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/dashboard/stats`, { headers });
  
  if (!response.ok) {
    throw new Error('Failed to fetch dashboard stats');
  }
  return response.json();
}

export interface Vulnerability {
  project_name?: string;
  scan_id?: string;
  component_name: string;
  component_version: string;
  cve_id: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  summary: string;
  fixed_version: string;
}

export interface VulnDetail {
  id: string;
  severity: string;
  summary: string;
}

export interface GroupedVulnResponse {
  component_name: string;
  component_version: string;
  ecosystem: string;
  highest_severity: string;
  cve_count: number;
  cves: string[];
  cves_detail: VulnDetail[];
  clean_version: string;
}

export interface ScanVulnerabilitiesResponse {
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  vulnerabilities?: Vulnerability[];
  grouped?: GroupedVulnResponse[];
}

export interface AllVulnerabilitiesResponse {
  vulnerabilities: Vulnerability[];
}

export async function getScanVulnerabilities(scanId: string, grouped = false): Promise<ScanVulnerabilitiesResponse> {
  const headers = await getAuthHeaders();
  const url = grouped ? `${API_URL}/scans/${scanId}/vulnerabilities?grouped=true` : `${API_URL}/scans/${scanId}/vulnerabilities`;
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch scan vulnerabilities');
  }
  return response.json();
}

export async function getAllVulnerabilities(): Promise<AllVulnerabilitiesResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/vulnerabilities`, { headers });
  if (!response.ok) {
    throw new Error('Failed to fetch vulnerabilities');
  }
  return response.json();
}

export async function generateSBOM(scanId: string, format: string): Promise<{ sbom_id: string; sha256: string; download_url: string; component_count: number }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/${scanId}/sbom`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ format })
  });
  if (!response.ok) throw new Error('Failed to generate SBOM');
  return response.json();
}

export async function createShareLink(sbomId: string, label: string, expiresInDays: number): Promise<{ share_url: string; expires_at: string; label: string }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/sboms/${sbomId}/share`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ label, expires_in_days: expiresInDays })
  });
  if (!response.ok) throw new Error('Failed to create share link');
  return response.json();
}

export async function getShareLinks(sbomId: string): Promise<{ shares: any[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/sboms/${sbomId}/shares`, { headers });
  if (!response.ok) throw new Error('Failed to list share links');
  return response.json();
}

export async function revokeShareLink(sbomId: string, token: string): Promise<void> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/sboms/${sbomId}/shares/${token}`, {
    method: 'DELETE',
    headers
  });
  if (!response.ok) throw new Error('Failed to revoke share link');
}

export async function getPublicShare(token: string): Promise<any> {
  const response = await fetch(`${API_URL}/share/${token}`);
  if (!response.ok) {
    if (response.status === 410) throw new Error('Expired');
    throw new Error('Failed to fetch public share');
  }
  return response.json();
}

export async function getScanShareLinks(scanId: string): Promise<{ shares: any[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/${scanId}/shares`, { headers });
  if (!response.ok) throw new Error('Failed to list scan share links');
  return response.json();
}

// ── Compliance ──────────────────────────────────────────────────────────────

export interface NTIAElement {
  name: string;
  description: string;
  passed: boolean;
  coverage: number;
  detail: string;
}

export interface NTIAResult {
  compliant: boolean;
  score: number;
  elements: NTIAElement[];
  failed_components?: { name: string; version: string; missing: string[] }[];
  recommendations: string[];
}

export interface ComplianceResponse {
  ntia: NTIAResult;
  eu_cra_compliant: boolean;
  status: string;
}

export async function getCompliance(scanId: string): Promise<ComplianceResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/${scanId}/compliance`, { headers });
  if (!response.ok) throw new Error('Failed to fetch compliance data');
  return response.json();
}

/**
 * Triggers a browser file download for the PDF compliance report.
 * Returns the fetch Response so callers can check status before consuming.
 */
export async function downloadPDFReport(scanId: string): Promise<void> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error('Not authenticated');

  const response = await fetch(`${API_URL}/scans/${scanId}/report/pdf`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to generate PDF report');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // pick filename from Content-Disposition header if present
  const cd = response.headers.get('Content-Disposition') || '';
  const match = cd.match(/filename="([^"]+)"/);
  a.download = match?.[1] ?? `sbom-report-${scanId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function listGitHubRepos(): Promise<{ repositories: GitHubRepository[] }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  const authHeaders = await getAuthHeaders();

  // Pass the live provider_token (GitHub OAuth) so backend doesn't use the stale DB token
  const headers: Record<string, string> = { ...authHeaders };
  if (session?.provider_token) {
    headers['X-GitHub-Token'] = session.provider_token;
  }

  const response = await fetch(`${API_URL}/github/repos`, { headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to fetch GitHub repositories');
  }
  return response.json();
}

export interface FixPRRequest {
  vulnerabilities: {
    package_name: string;
    current_version: string;
    fixed_version: string;
    cve_id: string;
    ecosystem: string;
  }[];
}

export interface FixPRResponse {
  pr_url: string;
  pr_number: number;
  message: string;
}

export interface FixPRStatus {
  stage: string;
  progress: number;
  message: string;
  pr_url?: string;
  pr_number?: number;
  error?: string;
  completed: boolean;
}

export interface FixPR {
  id: string;
  pr_url: string;
  pr_number: number;
  pr_title: string;
  status: string;
  created_at: string;
  packages_fixed: number;
  package_names?: string[];
}

export async function createFixPR(scanId: string, req: FixPRRequest): Promise<FixPRResponse> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/${scanId}/fix-pr`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to create PR');
  }
  return response.json();
}

export async function getFixPRStatus(scanId: string): Promise<FixPRStatus> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/${scanId}/fix-pr/status`, { headers });
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to get PR status');
  }
  return response.json();
}

export async function getFixPRs(scanId: string): Promise<{ prs: FixPR[] }> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_URL}/scans/${scanId}/fix-prs`, {
    headers,
    cache: 'no-store'
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || 'Failed to fetch PRs');
  }
  return response.json();
}

// ── Workspace API ──────────────────────────────────────────────────────────

export async function listWorkspaces(): Promise<{ workspaces: Workspace[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces`, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to list workspaces');
  return res.json();
}

export async function createWorkspace(data: { name: string; slug: string; description?: string }): Promise<Workspace> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create workspace');
  }
  return res.json();
}

export async function getWorkspace(id: string): Promise<Workspace> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${id}`, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch workspace');
  return res.json();
}

export async function updateWorkspace(id: string, data: { name?: string; description?: string }): Promise<Workspace> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update workspace');
  }
  return res.json();
}

export async function deleteWorkspace(id: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${id}`, { method: 'DELETE', headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete workspace');
  }
}

export async function listWorkspaceMembers(workspaceId: string): Promise<{ members: WorkspaceMember[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members`, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to list members');
  return res.json();
}

export async function updateMemberRole(workspaceId: string, memberId: string, role: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ role }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update member role');
  }
}

export async function removeMember(workspaceId: string, memberId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to remove member');
  }
}

export async function inviteMember(workspaceId: string, data: { email: string; role: string }): Promise<{ success: boolean; token: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invite`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create invitation');
  }
  return res.json();
}

export async function listInvitations(workspaceId: string): Promise<{ invitations: WorkspaceInvitation[] }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitations`, { headers, cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to list invitations');
  return res.json();
}

export async function cancelInvitation(workspaceId: string, invitationId: string): Promise<void> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/workspaces/${workspaceId}/invitations/${invitationId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to cancel invitation');
  }
}

export async function getInvitationPublic(token: string): Promise<{ workspace_name: string; email: string; invited_by_name: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/invite/${token}`, { headers, cache: 'no-store' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch invitation details');
  }
  return res.json();
}

export async function acceptInvitation(token: string): Promise<{ workspace_id: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/invite/${token}/accept`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to accept invitation');
  }
  return res.json();
}
