import type {
  LoginResponse,
  AuthUser,
  FRCUser,
  CreateUserBody,
  UpdateUserBody,
  Institution,
  CreateInstitutionBody,
  FRCCase,
  UpdateCaseBody,
  CaseStatus,
  LegalRule,
  CreateLegalRuleBody,
  Report,
  CreateReportBody,
  UpdateReportBody,
  ReportStatus,
  Referral,
  CreateReferralBody,
  ReferralStatus,
  AuditLog,
  ApiResponse,
  PaginatedData,
  InstitutionStatus,
} from '@/types';

// Use the Next.js rewrite proxy when running in the browser to avoid CORS.
// The proxy route /api/backend/* forwards server-side to Render.
// In local dev or server-side, use the direct backend URL.
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // Browser: route through Next.js rewrite proxy (avoids CORS entirely)
    return '/api/backend';
  }
  // Server-side / local: direct URL
  return process.env.NEXT_PUBLIC_API_URL ||
    'https://financial-intelligence-processing-system.onrender.com/api/v1';
}

// ─── Token Management ─────────────────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('frc_access_token');
}

export function setToken(token: string): void {
  sessionStorage.setItem('frc_access_token', token);
}

export function clearToken(): void {
  sessionStorage.removeItem('frc_access_token');
  sessionStorage.removeItem('frc_user');
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem('frc_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser): void {
  sessionStorage.setItem('frc_user', JSON.stringify(user));
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${getBaseUrl()}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Don't clear demo tokens — they're locally valid
    if (!isDemoToken(getToken() || '')) {
      clearToken();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    throw new Error('Unauthorized');
  }

  const data = await response.json();
  return data as ApiResponse<T>;
}

// ─── Demo bypass credentials ──────────────────────────────────────────────────
// These work even when the backend DB has no users seeded yet.

const DEMO_USERS: Record<string, LoginResponse> = {
  'admin@frc.go.ke': {
    access_token: 'demo_token_admin',
    token_type: 'bearer',
    expires_in: 3600,
    user_id: 'demo-admin-001',
    full_name: 'FRC Administrator',
    role: 'frc_admin',
  },
  'analyst@frc.go.ke': {
    access_token: 'demo_token_analyst',
    token_type: 'bearer',
    expires_in: 3600,
    user_id: 'demo-analyst-001',
    full_name: 'FRC Analyst',
    role: 'frc_analyst',
  },
  'investigator@frc.go.ke': {
    access_token: 'demo_token_investigator',
    token_type: 'bearer',
    expires_in: 3600,
    user_id: 'demo-investigator-001',
    full_name: 'FRC Investigator',
    role: 'investigator',
  },
  'auditor@frc.go.ke': {
    access_token: 'demo_token_auditor',
    token_type: 'bearer',
    expires_in: 3600,
    user_id: 'demo-auditor-001',
    full_name: 'FRC Auditor',
    role: 'audit_viewer',
  },
};

const DEMO_PASSWORDS: Record<string, string> = {
  'admin@frc.go.ke': 'FRCAdmin2026!',
  'analyst@frc.go.ke': 'FRCAnalyst2026!',
  'investigator@frc.go.ke': 'FRCInvest2026!',
  'auditor@frc.go.ke': 'FRCAudit2026!',
};

export function isDemoToken(token: string): boolean {
  return token.startsWith('demo_token_');
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<LoginResponse> {
  // ── Demo bypass: if backend DB has no users, use local demo session ──
  const demoUser = DEMO_USERS[email.toLowerCase()];
  if (demoUser && DEMO_PASSWORDS[email.toLowerCase()] === password) {
    try {
      // Try real backend first
      const res = await fetch(`${getBaseUrl()}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.access_token) return data as LoginResponse;
      if (res.ok && data.data?.access_token) return data.data as LoginResponse;
      // Backend rejected (no users seeded) — fall through to demo
    } catch {
      // Network error — fall through to demo
    }
    // Return demo session
    return demoUser;
  }

  // ── Real backend login ──
  const res = await fetch(`${getBaseUrl()}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.error || 'Invalid email or password.');
  }

  if (data.access_token) return data as LoginResponse;
  if (data.data?.access_token) return data.data as LoginResponse;
  throw new Error('Login failed');
}

export async function getMe(): Promise<AuthUser> {
  // Demo tokens: reconstruct from stored user — no backend call needed
  const token = getToken();
  if (token && isDemoToken(token)) {
    const stored = getStoredUser();
    if (stored) return stored;
    throw new Error('Demo session expired');
  }
  const res = await apiFetch<AuthUser>('/auth/me');
  // Backend returns user directly (not wrapped in {success, data})
  const payload = (res as unknown as Record<string, unknown>);
  if (payload.id || payload.user_id) return res as unknown as AuthUser;
  if (!res.success) throw new Error(res.error || 'Failed to fetch user');
  return res.data;
}

export async function changePassword(current_password: string, new_password: string): Promise<void> {
  const res = await apiFetch<unknown>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to change password');
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUsers(page = 1, page_size = 20): Promise<PaginatedData<FRCUser>> {
  const res = await apiFetch<PaginatedData<FRCUser>>(`/users?page=${page}&page_size=${page_size}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch users');
  return res.data;
}

export async function createUser(body: CreateUserBody): Promise<FRCUser> {
  const res = await apiFetch<FRCUser>('/users', { method: 'POST', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to create user');
  return res.data;
}

export async function getUserById(id: string): Promise<FRCUser> {
  const res = await apiFetch<FRCUser>(`/users/${id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch user');
  return res.data;
}

export async function updateUser(id: string, body: UpdateUserBody): Promise<FRCUser> {
  const res = await apiFetch<FRCUser>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to update user');
  return res.data;
}

export async function deleteUser(id: string): Promise<void> {
  const res = await apiFetch<unknown>(`/users/${id}`, { method: 'DELETE' });
  if (!res.success) throw new Error(res.error || 'Failed to deactivate user');
}

// ─── Institutions ─────────────────────────────────────────────────────────────

export async function getInstitutions(
  page = 1,
  page_size = 20,
  status?: string,
  institution_type?: string
): Promise<PaginatedData<Institution>> {
  const params = new URLSearchParams({ page: String(page), page_size: String(page_size) });
  if (status) params.set('status', status);
  if (institution_type) params.set('institution_type', institution_type);
  const res = await apiFetch<PaginatedData<Institution>>(`/institutions?${params}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch institutions');
  return res.data;
}

export async function createInstitution(body: CreateInstitutionBody): Promise<Institution> {
  const res = await apiFetch<Institution>('/institutions', { method: 'POST', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to create institution');
  return res.data;
}

export async function getInstitutionById(id: string): Promise<Institution> {
  const res = await apiFetch<Institution>(`/institutions/${id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch institution');
  return res.data;
}

export async function updateInstitution(id: string, body: Partial<CreateInstitutionBody>): Promise<Institution> {
  const res = await apiFetch<Institution>(`/institutions/${id}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to update institution');
  return res.data;
}

export async function patchInstitutionStatus(id: string, status: InstitutionStatus): Promise<Institution> {
  const res = await apiFetch<Institution>(`/institutions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to update status');
  return res.data;
}

export async function generateApiKey(id: string): Promise<{ api_key: string }> {
  const res = await apiFetch<{ api_key: string }>(`/institutions/${id}/api-key`, { method: 'POST' });
  if (!res.success) throw new Error(res.error || 'Failed to generate API key');
  return res.data;
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export async function getCases(params: {
  status?: string;
  report_type?: string;
  priority?: string;
  institution_id?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedData<FRCCase>> {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.report_type) q.set('report_type', params.report_type);
  if (params.priority) q.set('priority', params.priority);
  if (params.institution_id) q.set('institution_id', params.institution_id);
  q.set('page', String(params.page || 1));
  q.set('page_size', String(params.page_size || 20));
  const res = await apiFetch<PaginatedData<FRCCase>>(`/cases?${q}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch cases');
  return res.data;
}

export async function getCaseById(frc_case_id: string): Promise<FRCCase> {
  const res = await apiFetch<FRCCase>(`/cases/${frc_case_id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch case');
  return res.data;
}

export async function patchCaseStatus(frc_case_id: string, status: CaseStatus): Promise<FRCCase> {
  const res = await apiFetch<FRCCase>(`/cases/${frc_case_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to update case status');
  return res.data;
}

export async function updateCase(frc_case_id: string, body: UpdateCaseBody): Promise<FRCCase> {
  const res = await apiFetch<FRCCase>(`/cases/${frc_case_id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  if (!res.success) throw new Error(res.error || 'Failed to update case');
  return res.data;
}

// ─── Legal Rules ──────────────────────────────────────────────────────────────

export async function getLegalRules(params: {
  tag?: string;
  rule_type?: string;
  case_type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedData<LegalRule>> {
  const q = new URLSearchParams();
  if (params.tag) q.set('tag', params.tag);
  if (params.rule_type) q.set('rule_type', params.rule_type);
  if (params.case_type) q.set('case_type', params.case_type);
  if (params.search) q.set('search', params.search);
  q.set('page', String(params.page || 1));
  q.set('page_size', String(params.page_size || 20));
  const res = await apiFetch<PaginatedData<LegalRule>>(`/legal/rules?${q}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch legal rules');
  return res.data;
}

export async function getLegalRuleByCode(rule_code: string): Promise<LegalRule> {
  const res = await apiFetch<LegalRule>(`/legal/rules/${rule_code}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch legal rule');
  return res.data;
}

export async function createLegalRule(body: CreateLegalRuleBody): Promise<LegalRule> {
  const res = await apiFetch<LegalRule>('/legal/rules', { method: 'POST', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to create legal rule');
  return res.data;
}

export async function updateLegalRule(rule_code: string, body: Partial<CreateLegalRuleBody>): Promise<LegalRule> {
  const res = await apiFetch<LegalRule>(`/legal/rules/${rule_code}`, { method: 'PUT', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to update legal rule');
  return res.data;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function getReports(params: {
  frc_case_id?: string;
  status?: string;
  destination?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedData<Report>> {
  const q = new URLSearchParams();
  if (params.frc_case_id) q.set('frc_case_id', params.frc_case_id);
  if (params.status) q.set('status', params.status);
  if (params.destination) q.set('destination', params.destination);
  q.set('page', String(params.page || 1));
  q.set('page_size', String(params.page_size || 20));
  const res = await apiFetch<PaginatedData<Report>>(`/reports?${q}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch reports');
  return res.data;
}

export async function createReport(body: CreateReportBody): Promise<Report> {
  const res = await apiFetch<Report>('/reports', { method: 'POST', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to create report');
  return res.data;
}

export async function getReportById(report_id: string): Promise<Report> {
  const res = await apiFetch<Report>(`/reports/${report_id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch report');
  return res.data;
}

export async function updateReport(report_id: string, body: UpdateReportBody): Promise<Report> {
  const res = await apiFetch<Report>(`/reports/${report_id}`, { method: 'PATCH', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to update report');
  return res.data;
}

export async function patchReportStatus(report_id: string, status: ReportStatus): Promise<Report> {
  const res = await apiFetch<Report>(`/reports/${report_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to update report status');
  return res.data;
}

export async function getReportsByCase(frc_case_id: string): Promise<Report[]> {
  const res = await apiFetch<Report[]>(`/reports/case/${frc_case_id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch case reports');
  return res.data;
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export async function getReferrals(params: {
  frc_case_id?: string;
  status?: string;
  destination_body?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedData<Referral>> {
  const q = new URLSearchParams();
  if (params.frc_case_id) q.set('frc_case_id', params.frc_case_id);
  if (params.status) q.set('status', params.status);
  if (params.destination_body) q.set('destination_body', params.destination_body);
  q.set('page', String(params.page || 1));
  q.set('page_size', String(params.page_size || 20));
  const res = await apiFetch<PaginatedData<Referral>>(`/referrals?${q}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch referrals');
  return res.data;
}

export async function createReferral(body: CreateReferralBody): Promise<Referral> {
  const res = await apiFetch<Referral>('/referrals', { method: 'POST', body: JSON.stringify(body) });
  if (!res.success) throw new Error(res.error || 'Failed to create referral');
  return res.data;
}

export async function getReferralById(referral_id: string): Promise<Referral> {
  const res = await apiFetch<Referral>(`/referrals/${referral_id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch referral');
  return res.data;
}

export async function patchReferralStatus(
  referral_id: string,
  status: ReferralStatus,
  notes?: string
): Promise<Referral> {
  const res = await apiFetch<Referral>(`/referrals/${referral_id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
  if (!res.success) throw new Error(res.error || 'Failed to update referral status');
  return res.data;
}

export async function getReferralDestinations(): Promise<string[]> {
  const res = await apiFetch<string[]>('/referrals/meta/destinations');
  if (!res.success) throw new Error(res.error || 'Failed to fetch destinations');
  return res.data;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function getAuditLogs(params: {
  module?: string;
  action?: string;
  user_id?: string;
  page?: number;
  page_size?: number;
}): Promise<PaginatedData<AuditLog>> {
  const q = new URLSearchParams();
  if (params.module) q.set('module', params.module);
  if (params.action) q.set('action', params.action);
  if (params.user_id) q.set('user_id', params.user_id);
  q.set('page', String(params.page || 1));
  q.set('page_size', String(params.page_size || 20));
  const res = await apiFetch<PaginatedData<AuditLog>>(`/audit-logs?${q}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch audit logs');
  return res.data;
}

export async function getAuditLogById(id: string): Promise<AuditLog> {
  const res = await apiFetch<AuditLog>(`/audit-logs/${id}`);
  if (!res.success) throw new Error(res.error || 'Failed to fetch audit log');
  return res.data;
}
