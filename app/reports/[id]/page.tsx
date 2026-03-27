'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, ChevronDown, Edit2, Calendar } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { ReportStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { getReportById, patchReportStatus, updateReport } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Report, ReportStatus, ReportType } from '@/types';

const STATUS_FLOW: ReportStatus[] = ['draft', 'under_review', 'finalised', 'sent'];
const REPORT_TYPES = ['str', 'ctr', 'sar', 'cross_border', 'sanctions_freeze', 'terrorism_financing', 'corruption', 'other'];
const DESTINATIONS = ['FRC', 'DCI', 'KRA', 'CBK', 'EACC', 'NIS', 'ARA', 'ANTI_TERROR', 'EGMONT', 'CUSTOMS', 'COMMITTEE', 'OTHER'];

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-slate-800 last:border-0">
      <dt className="w-40 flex-shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="flex-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const canEdit = hasRole(['frc_admin', 'frc_analyst']);

  const [report, setReport] = useState<Report | null>(null);
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

  return (
    <AppLayout title="Report Detail" subtitle={report?.title}>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : !report ? null : (
        <div className="space-y-6 max-w-4xl">
          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/reports" className="text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-xs text-slate-500">Reports /</p>
                <h2 className="text-white font-semibold truncate max-w-sm">{report.title}</h2>
              </div>
            </div>
            {canEdit && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => setStatusModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
                >
                  <ChevronDown size={14} /> Update Status
                </button>
              </div>
            )}
          </div>

          {/* Status progress */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Report Progress</p>
            <div className="flex items-center">
              {STATUS_FLOW.map((s, i) => {
                const isDone = i <= statusIdx;
                const isCurrent = i === statusIdx;
                return (
                  <div key={s} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 ${isCurrent ? 'bg-purple-600 border-purple-400 text-white' : isDone ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                        {i + 1}
                      </div>
                      <span className={`text-xs mt-1.5 text-center ${isCurrent ? 'text-purple-400' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {s.replace(/_/g, ' ')}
                      </span>
                    </div>
                    {i < STATUS_FLOW.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-1rem] ${i < statusIdx ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core info */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={16} className="text-purple-400" />
              <h3 className="text-sm font-semibold text-slate-200">Report Details</h3>
            </div>
            <dl>
              <InfoRow label="Report ID" value={<span className="font-mono text-purple-400 text-xs">{report.report_id}</span>} />
              <InfoRow label="Case ID" value={
                <Link href={`/cases/${report.frc_case_id}`} className="text-cyan-400 font-mono hover:text-cyan-300 transition-colors">
                  {report.frc_case_id}
                </Link>
              } />
              <InfoRow label="Type" value={<span className="uppercase text-slate-300">{report.report_type}</span>} />
              <InfoRow label="Status" value={<ReportStatusBadge status={report.status} />} />
              <InfoRow label="Destination" value={report.destination || '—'} />
              <InfoRow label="Legal Basis" value={report.legal_basis || '—'} />
            </dl>
          </div>

          {/* Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-200 mb-3">Summary</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{report.summary}</p>
          </div>

          {/* Content */}
          {report.content && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-slate-200 mb-3">Full Report Content</h3>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-800 rounded-lg p-4">
                {report.content}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar size={14} className="text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-200">Timestamps</h3>
            </div>
            <dl>
              <InfoRow label="Created At" value={new Date(report.created_at).toLocaleString('en-KE')} />
              {report.updated_at && (
                <InfoRow label="Last Updated" value={new Date(report.updated_at).toLocaleString('en-KE')} />
              )}
            </dl>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Report Status">
        <div className="space-y-4">
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
                {REPORT_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination</label>
              <select value={editDestination} onChange={(e) => setEditDestination(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                <option value="">Select</option>
                {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Summary</label>
              <textarea value={editSummary} onChange={(e) => setEditSummary(e.target.value)} rows={3} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Content</label>
              <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={5} className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
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
