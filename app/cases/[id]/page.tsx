'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Building2,
  AlertTriangle,
  FileText,
  Send,
  Scale,
  ChevronDown,
  CheckCircle2,
  Edit2,
  Trash2,
  Archive,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { CaseStatusBadge, PriorityBadge, ReportStatusBadge, ReferralStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { getCaseById, patchCaseStatus, updateCase, deleteCase, getReportsByCase, getReferrals } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { FRCCase, CaseStatus, Report, Referral } from '@/types';
import { useRouter } from 'next/navigation';

const STATUS_FLOW: CaseStatus[] = [
  'received', 'under_review', 'investigating',
  'report_generated', 'referred',
  'cleared_as_legal', 'archived', 'closed',
];

function DetailSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-0 py-2.5 border-b border-slate-800 last:border-0">
      <dt className="w-40 flex-shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="flex-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

export default function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const router = useRouter();
  const canEdit = hasRole(['frc_admin', 'frc_analyst']);
  const isAdmin = hasRole(['frc_admin']);

  const [caseData, setCaseData] = useState<FRCCase | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<CaseStatus>('received');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusNotes, setStatusNotes] = useState('');

  // Notes update modal
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [analystNotes, setAnalystNotes] = useState('');
  const [notesUpdating, setNotesUpdating] = useState(false);

  // Delete / clear action
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const loadCase = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [caseRes, reportsRes, referralsRes] = await Promise.all([
        getCaseById(id),
        getReportsByCase(id).catch(() => []),
        getReferrals({ frc_case_id: id, page: 1, page_size: 50 }).catch(() => ({ referrals: [], items: [], total: 0, page: 1, page_size: 50, total_pages: 1 })),
      ]);
      setCaseData(caseRes);
      setNewStatus(caseRes.status);
      setAnalystNotes(caseRes.analyst_notes || '');
      setReports(Array.isArray(reportsRes) ? reportsRes : []);
      const refList = referralsRes.referrals || referralsRes.items || [];
      setReferrals(refList);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load case');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCase();
  }, [id]);

  const handleStatusUpdate = async () => {
    if (!caseData) return;
    setStatusUpdating(true);
    try {
      const updated = await patchCaseStatus(id, newStatus, statusNotes || undefined);
      setCaseData(updated);
      setStatusModalOpen(false);
      setStatusNotes('');
    } catch (err: unknown) {
      setActionMsg(`✗ ${err instanceof Error ? err.message : 'Status update failed'}`);
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleNotesUpdate = async () => {
    setNotesUpdating(true);
    try {
      const updated = await updateCase(id, { analyst_notes: analystNotes });
      setCaseData(updated);
      setNotesModalOpen(false);
    } catch {
      // silently fail
    } finally {
      setNotesUpdating(false);
    }
  };

  const handleClearAsLegal = async () => {
    if (!window.confirm('Mark this case as Cleared as Legal? This records that the transaction was investigated and found to be lawful.')) return;
    setDeleteLoading(true);
    try {
      const updated = await patchCaseStatus(id, 'cleared_as_legal', 'Case investigated and found to be lawful.');
      setCaseData(updated);
      setActionMsg('✓ Case marked as Cleared as Legal');
    } catch (err: unknown) {
      setActionMsg(`✗ ${err instanceof Error ? err.message : 'Action failed'}`);
    } finally {
      setDeleteLoading(false);
      setTimeout(() => setActionMsg(''), 5000);
    }
  };

  const handleDeleteCase = async () => {
    if (!window.confirm('Soft-delete this case? It will be hidden from the default view but the audit trail is preserved.')) return;
    setDeleteLoading(true);
    try {
      await deleteCase(id);
      setActionMsg('✓ Case deleted');
      setTimeout(() => router.push('/cases'), 1500);
    } catch (err: unknown) {
      setActionMsg(`✗ ${err instanceof Error ? err.message : 'Delete failed'}`);
      setDeleteLoading(false);
    }
  };

  const triggerInfo = caseData?.trigger_info;
  const triggerText =
    typeof triggerInfo === 'string'
      ? triggerInfo
      : typeof triggerInfo === 'object' && triggerInfo !== null
      ? JSON.stringify(triggerInfo, null, 2)
      : null;

  return (
    <AppLayout title="Case Detail" subtitle={id}>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={loadCase} />
      ) : !caseData ? null : (
        <div className="space-y-6 max-w-6xl">
          {/* Breadcrumb + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/cases"
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-xs text-slate-500">Cases /</p>
                <h2 className="text-white font-mono font-semibold">{caseData.frc_case_id}</h2>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && (
                <>
                  <button
                    onClick={() => setNotesModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                  >
                    <Edit2 size={14} /> Notes
                  </button>
                  <button
                    onClick={() => setStatusModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
                  >
                    <ChevronDown size={14} /> Update Status
                  </button>
                </>
              )}
              {/* Clear as Legal — any editor */}
              {canEdit && caseData.status !== 'cleared_as_legal' && caseData.status !== 'deleted' && (
                <button
                  onClick={handleClearAsLegal}
                  disabled={deleteLoading}
                  title="Mark as cleared — investigated and found to be lawful"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg border border-emerald-500/30 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Clear as Legal
                </button>
              )}
              {/* Archive — any editor */}
              {canEdit && !['archived', 'deleted'].includes(caseData.status) && (
                <button
                  onClick={() => {
                    if (window.confirm('Archive this case?')) {
                      patchCaseStatus(id, 'archived').then(setCaseData).catch((e: Error) => setActionMsg(`✗ ${e.message}`));
                    }
                  }}
                  disabled={deleteLoading}
                  title="Move to archive"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-800 hover:bg-amber-500/10 text-slate-400 hover:text-amber-400 rounded-lg border border-slate-700 hover:border-amber-500/30 transition-all disabled:opacity-50"
                >
                  <Archive size={14} /> Archive
                </button>
              )}
              {/* Delete — admin only */}
              {isAdmin && caseData.status !== 'deleted' && (
                <button
                  onClick={handleDeleteCase}
                  disabled={deleteLoading}
                  title="Soft-delete this case (admin only)"
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all disabled:opacity-50"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          </div>

          {/* Action feedback */}
          {actionMsg && (
            <div className={`px-4 py-2.5 rounded-lg border text-sm ${actionMsg.startsWith('✓') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
              {actionMsg}
            </div>
          )}

          {/* Status progress bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Case Progress</p>
            <div className="flex items-center gap-0">
              {STATUS_FLOW.map((s, i) => {
                const currentIdx = STATUS_FLOW.indexOf(caseData.status);
                const isDone = i <= currentIdx;
                const isCurrent = i === currentIdx;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                          isCurrent
                            ? 'bg-cyan-600 border-cyan-400 text-white'
                            : isDone
                            ? 'bg-emerald-600 border-emerald-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-500'
                        }`}
                      >
                        {isDone && !isCurrent ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                      <span
                        className={`text-xs mt-1.5 font-medium text-center ${
                          isCurrent ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-slate-600'
                        }`}
                      >
                        {s.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div
                        className={`flex-1 h-0.5 mx-1 mt-[-1rem] ${
                          i < currentIdx ? 'bg-emerald-600' : 'bg-slate-800'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Main content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left: Core info */}
            <div className="lg:col-span-2 space-y-5">
              <DetailSection title="Case Summary" icon={<FileText size={16} />}>
                <dl className="divide-y divide-slate-800">
                  <InfoRow label="Case ID" value={<span className="font-mono text-cyan-400">{caseData.frc_case_id}</span>} />
                  <InfoRow label="Report Type" value={<span className="capitalize">{caseData.report_type?.replace(/_/g, ' ')}</span>} />
                  <InfoRow label="Status" value={<CaseStatusBadge status={caseData.status} />} />
                  <InfoRow label="Priority" value={<PriorityBadge priority={caseData.priority} />} />
                  {caseData.risk_score !== undefined && (
                    <InfoRow label="Risk Score" value={
                      <span className={`font-semibold ${caseData.risk_score >= 70 ? 'text-red-400' : caseData.risk_score >= 40 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {caseData.risk_score}
                      </span>
                    } />
                  )}
                  <InfoRow
                    label="Summary"
                    value={<p className="text-slate-300">{caseData.summary || 'No summary provided.'}</p>}
                  />
                </dl>
              </DetailSection>

              <DetailSection title="Institution" icon={<Building2 size={16} />}>
                <dl className="divide-y divide-slate-800">
                  <InfoRow label="Institution ID" value={<span className="font-mono text-slate-300">{caseData.institution_id}</span>} />
                  {caseData.institution_name && (
                    <InfoRow label="Institution" value={caseData.institution_name} />
                  )}
                </dl>
                {caseData.institution_id && (
                  <div className="mt-3">
                    <Link
                      href={`/institutions/${caseData.institution_id}`}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      View institution details →
                    </Link>
                  </div>
                )}
              </DetailSection>

              {triggerText && (
                <DetailSection title="Risk / Trigger Information" icon={<AlertTriangle size={16} />}>
                  <pre className="text-slate-300 text-xs bg-slate-800 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-words">
                    {triggerText}
                  </pre>
                </DetailSection>
              )}

              <DetailSection title="Analyst Notes" icon={<Edit2 size={16} />}>
                {caseData.analyst_notes ? (
                  <p className="text-slate-300 text-sm leading-relaxed">{caseData.analyst_notes}</p>
                ) : (
                  <p className="text-slate-500 text-sm italic">No analyst notes yet.</p>
                )}
              </DetailSection>

              <DetailSection title="Timestamps" icon={<Calendar size={16} />}>
                <dl className="divide-y divide-slate-800">
                  <InfoRow label="Created At" value={new Date(caseData.created_at).toLocaleString('en-KE')} />
                  {caseData.updated_at && (
                    <InfoRow label="Last Updated" value={new Date(caseData.updated_at).toLocaleString('en-KE')} />
                  )}
                  {caseData.submitted_at && (
                    <InfoRow label="Submitted At" value={new Date(caseData.submitted_at).toLocaleString('en-KE')} />
                  )}
                </dl>
              </DetailSection>
            </div>

            {/* Right: Legal, Reports, Referrals */}
            <div className="space-y-5">
              {/* Legal References */}
              <DetailSection title="Legal References" icon={<Scale size={16} />}>
                {!caseData.legal_references || caseData.legal_references.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No legal rules linked.</p>
                ) : (
                  <div className="space-y-3">
                    {caseData.legal_references.map((rule) => (
                      <div key={rule.rule_code} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-xs font-mono text-cyan-400">{rule.rule_code}</span>
                          <span className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded">{rule.rule_type}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-200">{rule.act_name}</p>
                        {rule.section && <p className="text-xs text-slate-400 mt-0.5">{rule.section}</p>}
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{rule.summary}</p>
                        {rule.tag && (
                          <span className="inline-block mt-1.5 text-xs bg-cyan-600/20 text-cyan-400 px-2 py-0.5 rounded-full">{rule.tag}</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-3">
                  <Link href="/legal" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                    Browse legal rules →
                  </Link>
                </div>
              </DetailSection>

              {/* Linked Reports */}
              <DetailSection title="Linked Reports" icon={<FileText size={16} />}>
                {reports.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No reports generated.</p>
                ) : (
                  <div className="space-y-2">
                    {reports.map((r) => (
                      <div key={r.report_id} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-mono text-purple-400">{r.report_id}</span>
                          <ReportStatusBadge status={r.status} />
                        </div>
                        <p className="text-sm font-medium text-slate-200 truncate">{r.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5 capitalize">{r.report_type?.replace(/_/g, ' ')}</p>
                        <Link
                          href={`/reports/${r.report_id}`}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1 block"
                        >
                          View report →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {hasRole(['frc_admin', 'frc_analyst']) && (
                  <Link
                    href={`/reports?frc_case_id=${id}`}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-3 block"
                  >
                    Create new report →
                  </Link>
                )}
              </DetailSection>

              {/* Linked Referrals */}
              <DetailSection title="Referrals" icon={<Send size={16} />}>
                {referrals.length === 0 ? (
                  <p className="text-slate-500 text-sm italic">No referrals created.</p>
                ) : (
                  <div className="space-y-2">
                    {referrals.map((r) => (
                      <div key={r.referral_id} className="bg-slate-800 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-200">{r.destination_body}</span>
                          <ReferralStatusBadge status={r.status} />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{r.reason}</p>
                        <Link
                          href={`/referrals?frc_case_id=${id}`}
                          className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-1 block"
                        >
                          View referral →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
                {hasRole(['frc_admin', 'frc_analyst']) && (
                  <Link
                    href="/referrals"
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors mt-3 block"
                  >
                    Create new referral →
                  </Link>
                )}
              </DetailSection>
            </div>
          </div>
        </div>
      )}

      {/* Status Update Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Case Status">
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Select the new status for this case.</p>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
            {isAdmin && <option value="deleted">deleted (admin only)</option>}
          </select>
          <textarea
            value={statusNotes}
            onChange={(e) => setStatusNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes for this status change..."
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setStatusModalOpen(false)}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusUpdate}
              disabled={statusUpdating}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {statusUpdating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Update Status
            </button>
          </div>
        </div>
      </Modal>

      {/* Notes Update Modal */}
      <Modal isOpen={notesModalOpen} onClose={() => setNotesModalOpen(false)} title="Edit Analyst Notes">
        <div className="space-y-4">
          <textarea
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            rows={6}
            placeholder="Enter analyst notes..."
            className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setNotesModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleNotesUpdate}
              disabled={notesUpdating}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {notesUpdating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Notes
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
