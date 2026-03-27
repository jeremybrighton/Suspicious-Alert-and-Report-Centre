'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  ChevronDown,
  Edit2,
  Calendar,
  Scale,
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Clock,
  Send,
  Printer,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { ReportStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { getReportById, patchReportStatus, updateReport, getLegalRules } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Report, ReportStatus, ReportType, LegalRule } from '@/types';

const STATUS_FLOW: ReportStatus[] = ['draft', 'under_review', 'finalised', 'sent'];

const REPORT_TYPE_LABELS: Record<string, string> = {
  str: 'Suspicious Transaction Report (STR)',
  ctr: 'Cash Transaction Report (CTR)',
  sar: 'Suspicious Activity Report (SAR)',
  cross_border: 'Cross-Border Case Report',
  sanctions_freeze: 'Sanctions Freeze Report',
  terrorism_financing: 'Terrorism Financing Report',
  corruption: 'Corruption / Economic Crime Report',
  other: 'Other Report',
};

const DESTINATION_LABELS: Record<string, string> = {
  FRC: 'Financial Reporting Centre',
  DCI: 'Directorate of Criminal Investigations',
  KRA: 'Kenya Revenue Authority',
  CBK: 'Central Bank of Kenya',
  EACC: 'Ethics and Anti-Corruption Commission',
  NIS: 'National Intelligence Service',
  ARA: 'Asset Recovery Agency',
  ANTI_TERROR: 'Anti-Terror Unit / NCTC',
  EGMONT: 'Egmont Group',
  CUSTOMS: 'KRA Customs',
  COMMITTEE: 'CFT Inter-Ministerial Committee',
  OTHER: 'Other Authority',
};

const REPORT_TYPES = ['str', 'ctr', 'sar', 'cross_border', 'sanctions_freeze', 'terrorism_financing', 'corruption', 'other'];
const DESTINATIONS = Object.keys(DESTINATION_LABELS);

function StatusStep({ label, state }: { label: string; state: 'done' | 'current' | 'pending' }) {
  return (
    <div className="flex flex-col items-center">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all ${
        state === 'current' ? 'bg-purple-600 border-purple-400 text-white' :
        state === 'done' ? 'bg-emerald-600 border-emerald-500 text-white' :
        'bg-slate-800 border-slate-700 text-slate-500'
      }`}>
        {state === 'done' ? <CheckCircle2 size={14} /> : state === 'current' ? <Clock size={12} /> : <span className="text-xs">{STATUS_FLOW.indexOf(label as ReportStatus) + 1}</span>}
      </div>
      <span className={`text-xs mt-1.5 text-center whitespace-nowrap ${
        state === 'current' ? 'text-purple-400 font-medium' :
        state === 'done' ? 'text-emerald-400' : 'text-slate-600'
      }`}>
        {label.replace(/_/g, ' ')}
      </span>
    </div>
  );
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const canEdit = hasRole(['frc_admin', 'frc_analyst']);

  const [report, setReport] = useState<Report | null>(null);
  const [linkedRules, setLinkedRules] = useState<LegalRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<ReportStatus>('draft');
  const [statusUpdating, setStatusUpdating] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editType, setEditType] = useState<ReportType>('str');
  const [editDestination, setEditDestination] = useState('');
  const [editLegalBasis, setEditLegalBasis] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const loadReport = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getReportById(id);
      setReport(data);
      setNewStatus(data.status);
      setEditTitle(data.title);
      setEditSummary(data.summary);
      setEditContent(data.content || '');
      setEditType(data.report_type);
      setEditDestination(data.destination || '');
      setEditLegalBasis(data.legal_basis || '');

      // Load linked legal rules if any
      if (data.legal_rule_ids && data.legal_rule_ids.length > 0) {
        const rulesData = await getLegalRules({ page: 1, page_size: 100 });
        const allRules = rulesData.rules || rulesData.items || [];
        setLinkedRules(allRules.filter((r) => data.legal_rule_ids!.includes(r.rule_code)));
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const handleStatusUpdate = async () => {
    setStatusUpdating(true);
    try {
      const updated = await patchReportStatus(id, newStatus);
      setReport(updated);
      setStatusModalOpen(false);
    } catch { /* silent */ }
    finally { setStatusUpdating(false); }
  };

  const handleEdit = async () => {
    setIsEditing(true);
    try {
      const updated = await updateReport(id, {
        title: editTitle,
        summary: editSummary,
        content: editContent,
        report_type: editType,
        destination: editDestination,
        legal_basis: editLegalBasis,
      });
      setReport(updated);
      setEditModalOpen(false);
    } catch { /* silent */ }
    finally { setIsEditing(false); }
  };

  const statusIdx = report ? STATUS_FLOW.indexOf(report.status) : -1;

  const handlePrint = () => window.print();

  return (
    <AppLayout title="Report View" subtitle={report?.title}>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : !report ? null : (
        <div className="space-y-6 max-w-4xl">
          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Link href="/reports" className="text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-xs text-slate-500">Reports /</p>
                <h2 className="text-white font-semibold truncate max-w-xs">{report.title}</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all print:hidden"
              >
                <Printer size={14} /> Print
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() => setEditModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setStatusModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-all"
                  >
                    <ChevronDown size={14} /> Update Status
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Status progress */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Report Progress</p>
            <div className="flex items-center">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="flex items-center flex-1">
                  <StatusStep
                    label={s}
                    state={i < statusIdx ? 'done' : i === statusIdx ? 'current' : 'pending'}
                  />
                  {i < STATUS_FLOW.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-1 mt-[-1.2rem] ${i < statusIdx ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Report preview card — formal document feel */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {/* Document header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-8 w-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                      <FileText size={16} className="text-purple-400" />
                    </div>
                    <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                      {REPORT_TYPE_LABELS[report.report_type] || report.report_type}
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-white leading-tight">{report.title}</h1>
                  <p className="text-xs text-slate-500 font-mono mt-1">Ref: {report.report_id}</p>
                </div>
                <ReportStatusBadge status={report.status} />
              </div>

              {/* Key metadata row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-4 border-t border-slate-700">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Case Ref</p>
                  <Link href={`/cases/${report.frc_case_id}`} className="text-sm text-cyan-400 font-mono hover:text-cyan-300 transition-colors mt-0.5 block">
                    {report.frc_case_id}
                  </Link>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Destination</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Send size={12} className="text-emerald-400" />
                    <span className="text-sm text-slate-200">{report.destination || 'Not set'}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Created</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Calendar size={12} className="text-slate-400" />
                    <span className="text-sm text-slate-200">{new Date(report.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>
                {report.updated_at && (
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider">Updated</p>
                    <span className="text-sm text-slate-200 mt-0.5 block">{new Date(report.updated_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Report body sections */}
            <div className="divide-y divide-slate-800">
              {/* Summary */}
              <div className="px-6 py-5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="h-1 w-4 bg-purple-500 rounded" />
                  Executive Summary
                </h2>
                <p className="text-sm text-slate-200 leading-relaxed">{report.summary}</p>
              </div>

              {/* Full content */}
              {report.content && (
                <div className="px-6 py-5">
                  <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <span className="h-1 w-4 bg-purple-500 rounded" />
                    Full Report Content
                  </h2>
                  <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800/50 rounded-xl p-5 border border-slate-700">
                    {report.content}
                  </div>
                </div>
              )}

              {/* Legal Basis */}
              <div className="px-6 py-5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Scale size={13} className="text-slate-500" />
                  Legal Basis
                </h2>
                {report.legal_basis ? (
                  <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <p className="text-sm text-slate-200 leading-relaxed">{report.legal_basis}</p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No legal basis specified.</p>
                )}

                {/* Linked legal rules */}
                {linkedRules.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Linked Legal Rules</p>
                    {linkedRules.map((rule) => (
                      <div key={rule.rule_code} className="flex items-start gap-3 bg-slate-800 rounded-xl p-3.5 border border-slate-700">
                        <Scale size={14} className="text-cyan-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-mono text-cyan-400">{rule.rule_code}</span>
                            <span className="text-xs text-slate-500 capitalize">{rule.rule_type}</span>
                          </div>
                          <p className="text-sm font-medium text-slate-200">{rule.act_name}</p>
                          {rule.section && <p className="text-xs text-slate-400 mt-0.5">{rule.section}</p>}
                          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{rule.summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Destination */}
              <div className="px-6 py-5">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Building2 size={13} className="text-slate-500" />
                  Destination Institution
                </h2>
                {report.destination ? (
                  <div className="flex items-start gap-3 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                      <ArrowUpRight size={16} className="text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{report.destination}</p>
                      {DESTINATION_LABELS[report.destination] && (
                        <p className="text-xs text-slate-400 mt-0.5">{DESTINATION_LABELS[report.destination]}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1.5">
                        This report is intended for <strong className="text-slate-400">{report.destination}</strong> upon finalisation.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 italic">No destination institution assigned.</p>
                )}
              </div>
            </div>
          </div>

          {/* Quick action — finalise */}
          {canEdit && report.status === 'under_review' && (
            <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-emerald-300">Ready to finalise?</p>
                <p className="text-xs text-slate-400 mt-0.5">Mark this report as finalised when review is complete.</p>
              </div>
              <button
                onClick={async () => {
                  const updated = await patchReportStatus(id, 'finalised');
                  setReport(updated);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all flex-shrink-0"
              >
                <CheckCircle2 size={14} /> Mark Finalised
              </button>
            </div>
          )}
          {canEdit && report.status === 'finalised' && (
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-blue-300">Ready to send?</p>
                <p className="text-xs text-slate-400 mt-0.5">Mark this report as sent once dispatched to {report.destination || 'destination'}.</p>
              </div>
              <button
                onClick={async () => {
                  const updated = await patchReportStatus(id, 'sent');
                  setReport(updated);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all flex-shrink-0"
              >
                <Send size={14} /> Mark Sent
              </button>
            </div>
          )}
        </div>
      )}

      {/* Status Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Report Status">
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Select the new status for this report.</p>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as ReportStatus)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {STATUS_FLOW.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStatusModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleStatusUpdate}
              disabled={statusUpdating}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {statusUpdating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Update
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Report" size="lg">
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Title</label>
              <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Report Type</label>
              <select value={editType} onChange={(e) => setEditType(e.target.value as ReportType)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {REPORT_TYPES.map((t) => <option key={t} value={t}>{REPORT_TYPE_LABELS[t] || t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination</label>
              <select value={editDestination} onChange={(e) => setEditDestination(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">Select destination</option>
                {DESTINATIONS.map((d) => <option key={d} value={d}>{d} — {DESTINATION_LABELS[d]}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Executive Summary</label>
              <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Content</label>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={6} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Legal Basis</label>
              <input type="text" value={editLegalBasis} onChange={(e) => setEditLegalBasis(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 mt-4">
          <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
          <button onClick={handleEdit} disabled={isEditing} className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2">
            {isEditing && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Save Changes
          </button>
        </div>
      </Modal>
    </AppLayout>
  );
}
