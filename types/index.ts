// ─── Auth ────────────────────────────────────────────────────────────────────

export type UserRole = 'frc_admin' | 'frc_analyst' | 'investigator' | 'audit_viewer';

export interface AuthUser {
  user_id: string;
  full_name: string;
  role: UserRole;
  email?: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  full_name: string;
  role: UserRole;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export interface FRCUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateUserBody {
  email: string;
  full_name: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserBody {
  full_name?: string;
  role?: UserRole;
  is_active?: boolean;
}

// ─── Institutions ─────────────────────────────────────────────────────────────

export type InstitutionType =
  | 'commercial_bank'
  | 'sacco'
  | 'payment_service_provider'
  | 'digital_credit_provider'
  | 'insurance_provider'
  | 'microfinance_institution'
  | 'investment_bank'
  | 'other';

export type InstitutionStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export interface Institution {
  id: string;
  institution_code: string;
  institution_name: string;
  institution_type: InstitutionType;
  supervisory_body: string;
  contact_email: string;
  status: InstitutionStatus;
  created_at: string;
  updated_at?: string;
}

export interface CreateInstitutionBody {
  institution_code: string;
  institution_name: string;
  institution_type: InstitutionType;
  supervisory_body: string;
  contact_email: string;
  status: InstitutionStatus;
}

// ─── Cases ────────────────────────────────────────────────────────────────────

export type CaseStatus =
  | 'received'
  | 'under_review'
  | 'report_generated'
  | 'referred'
  | 'closed';

export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export type CaseReportType =
  | 'suspicious_activity_report'
  | 'regulatory_threshold_report';

export interface FRCCase {
  frc_case_id: string;
  institution_id: string;
  institution_name?: string;
  report_type: CaseReportType;
  status: CaseStatus;
  priority: CasePriority;
  summary?: string;
  analyst_notes?: string;
  risk_score?: number;
  trigger_info?: string | Record<string, unknown>;
  legal_references?: LegalRule[];
  linked_report?: Report;
  linked_referrals?: Referral[];
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
}

export interface UpdateCaseBody {
  priority?: CasePriority;
  summary?: string;
  analyst_notes?: string;
}

// ─── Legal Rules ──────────────────────────────────────────────────────────────

export type LegalRuleType = 'act' | 'regulation' | 'guideline' | 'directive';

export interface LegalRule {
  rule_code: string;
  rule_type: LegalRuleType;
  act_name: string;
  section?: string;
  summary: string;
  case_type?: string;
  tag?: string;
  destination_body?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CreateLegalRuleBody {
  rule_code: string;
  rule_type: LegalRuleType;
  act_name: string;
  section?: string;
  summary: string;
  case_type?: string;
  tag?: string;
  destination_body?: string;
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export type ReportStatus = 'draft' | 'under_review' | 'finalised' | 'sent';

export type ReportType =
  | 'str'
  | 'ctr'
  | 'sar'
  | 'cross_border'
  | 'sanctions_freeze'
  | 'terrorism_financing'
  | 'corruption'
  | 'other';

export interface Report {
  report_id: string;
  frc_case_id: string;
  report_type: ReportType;
  title: string;
  summary: string;
  content?: string;
  destination?: string;
  legal_basis?: string;
  legal_rule_ids?: string[];
  status: ReportStatus;
  created_at: string;
  updated_at?: string;
}

export interface CreateReportBody {
  frc_case_id: string;
  report_type: ReportType;
  title: string;
  summary: string;
  content?: string;
  destination?: string;
  legal_basis?: string;
  legal_rule_ids?: string[];
}

export interface UpdateReportBody {
  report_type?: ReportType;
  title?: string;
  summary?: string;
  content?: string;
  destination?: string;
  legal_basis?: string;
  legal_rule_ids?: string[];
}

// ─── Referrals ────────────────────────────────────────────────────────────────

export type ReferralStatus = 'pending' | 'sent' | 'acknowledged' | 'closed';

export type ReferralDestination =
  | 'FRC'
  | 'DCI'
  | 'KRA'
  | 'CBK'
  | 'EACC'
  | 'NIS'
  | 'ARA'
  | 'ANTI_TERROR'
  | 'EGMONT'
  | 'CUSTOMS'
  | 'COMMITTEE'
  | 'OTHER';

export interface Referral {
  referral_id: string;
  frc_case_id: string;
  destination_body: ReferralDestination;
  reason: string;
  case_type?: string;
  routing_policy?: string;
  notes?: string;
  report_ids?: string[];
  status: ReferralStatus;
  created_at: string;
  updated_at?: string;
}

export interface CreateReferralBody {
  frc_case_id: string;
  destination_body: ReferralDestination;
  reason: string;
  case_type?: string;
  routing_policy?: string;
  notes?: string;
  report_ids?: string[];
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  module: string;
  action: string;
  user_id: string;
  user_name?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
  created_at: string;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  detail?: Record<string, unknown>;
}

export interface PaginatedData<T> {
  items?: T[];
  cases?: T[];
  reports?: T[];
  referrals?: T[];
  institutions?: T[];
  users?: T[];
  rules?: T[];
  logs?: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
