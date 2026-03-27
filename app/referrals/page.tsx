'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Plus,
  Send,
  ArrowRight,
  X,
  Calendar,
  FileText,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  ChevronRight,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { ReferralStatusBadge } from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { getReferrals, createReferral, patchReferralStatus } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Referral, ReferralStatus, ReferralDestination, CreateReferralBody } from '@/types';

const DESTINATIONS: ReferralDestination[] = ['FRC', 'DCI', 'KRA', 'CBK', 'EACC', 'NIS', 'ARA', 'ANTI_TERROR', 'EGMONT', 'CUSTOMS', 'COMMITTEE', 'OTHER'];

const DESTINATION_LABELS: Record<ReferralDestination, string> = {
  FRC: 'Financial Reporting Centre',
  DCI: 'Directorate of Criminal Investigations',
  KRA: 'Kenya Revenue Authority',
  CBK: 'Central Bank of Kenya',
  EACC: 'Ethics and Anti-Corruption Commission',
  NIS: 'National Intelligence Service',
  ARA: 'Asset Recovery Agency',
  ANTI_TERROR: 'Anti-Terror Unit / NCTC',
  EGMONT: 'Egmont Group (International)',
  CUSTOMS: 'KRA Customs',
  COMMITTEE: 'CFT Inter-Ministerial Committee',
  OTHER: 'Other Authority',
};

const STATUS_FLOW: ReferralStatus[] = ['pending', 'sent', 'acknowledged', 'closed'];
const STATUS_OPTIONS: ReferralStatus[] = ['pending', 'sent', 'acknowledged', 'closed'];

const INITIAL_FORM: CreateReferralBody = {
  frc_case_id: '',
  destination_body: 'DCI',
  reason: '',
  case_type: '',
  routing_policy: '',
  notes: '',
  report_ids: [],
};

function ReferralDetailPanel({ referral, onClose, canUpdate, onUpdate }: {
  referral: Referral;
  onClose: () => void;
  canUpdate: boolean;
  onUpdate: (updated: Referral) => void;
}) {
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<ReferralStatus>(referral.status);
  const [notes, setNotes] = useState('');
  const [showStatusForm, setShowStatusForm] = useState(false);

  const statusIdx = STATUS_FLOW.indexOf(referral.status);

  const handleUpdate = async () => {
    setUpdating(true);
    try {
      const updated = await patchReferralStatus(referral.referral_id, newStatus, notes);
      onUpdate(updated);
      setShowStatusForm(false);
      setNotes('');
    } catch { /* silent */ }
    finally { setUpdating(false); }
  };

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-3 z-10">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Send size={13} className="text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Referral Record</span>
            </div>
            <p className="text-xs font-mono text-slate-500">{referral.referral_id}</p>
          </div>
          <div className="flex items-center gap-2">
            <ReferralStatusBadge status={referral.status} />
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Destination */}
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <MapPin size={16} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-base font-bold text-white">{referral.destination_body}</p>
                <p className="text-sm text-slate-400">{DESTINATION_LABELS[referral.destination_body]}</p>
              </div>
            </div>
          </div>

          {/* Case link */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Linked Case</p>
            <Link
              href={`/cases/${referral.frc_case_id}`}
              className="flex items-center gap-3 bg-slate-800 rounded-xl p-3.5 border border-slate-700 hover:border-cyan-700/50 transition-colors group"
            >
              <FileText size={14} className="text-cyan-400 flex-shrink-0" />
              <span className="text-sm font-mono text-cyan-400">{referral.frc_case_id}</span>
              <ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-400 transition-colors ml-auto" />
            </Link>
          </div>

          {/* Tracking timeline */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Referral Timeline</p>
            <div className="space-y-0">
              {STATUS_FLOW.map((s, i) => {
                const isDone = i <= statusIdx;
                const isCurrent = i === statusIdx;
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                        isCurrent ? 'bg-cyan-600 border-cyan-400' :
                        isDone ? 'bg-emerald-600 border-emerald-500' :
                        'bg-slate-800 border-slate-700'
                      }`}>
                        {isDone ? <CheckCircle2 size={12} className="text-white" /> : <Circle size={12} className="text-slate-600" />}
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <div className={`w-0.5 h-8 mt-0.5 ${isDone && i < statusIdx ? 'bg-emerald-600' : 'bg-slate-800'}`} />
                      )}
                    </div>
                    <div className="pb-4 min-w-0">
                      <p className={`text-sm font-medium capitalize ${isCurrent ? 'text-cyan-400' : isDone ? 'text-emerald-400' : 'text-slate-600'}`}>
                        {s}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-slate-500 mt-0.5">Current status</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Reason for Referral</p>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-slate-200 leading-relaxed">{referral.reason}</p>
            </div>
          </div>

          {/* Notes */}
          {referral.notes && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Notes</p>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <p className="text-sm text-slate-300 leading-relaxed">{referral.notes}</p>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-slate-800 pt-4 space-y-2">
            {referral.case_type && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Case Type</span>
                <span className="text-slate-300 capitalize">{referral.case_type.replace(/_/g, ' ')}</span>
              </div>
            )}
            {referral.routing_policy && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Routing Policy</span>
                <span className="text-slate-300">{referral.routing_policy}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 flex items-center gap-1"><Calendar size={11} /> Created</span>
              <span className="text-slate-300">{new Date(referral.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            {referral.updated_at && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 flex items-center gap-1"><Clock size={11} /> Updated</span>
                <span className="text-slate-300">{new Date(referral.updated_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            )}
          </div>

          {/* Update status form */}
          {canUpdate && referral.status !== 'closed' && (
            <div className="border-t border-slate-800 pt-4">
              {!showStatusForm ? (
                <button
                  onClick={() => setShowStatusForm(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition-all"
                >
                  Update Referral Status
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Update Status</p>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as ReferralStatus)}
                    className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Status update notes (optional)..."
                    className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setShowStatusForm(false)} className="flex-1 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdate}
                      disabled={updating}
                      className="flex-1 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {updating && <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReferralsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const canCreate = hasRole(['frc_admin', 'frc_analyst']);

  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReferral, setSelectedReferral] = useState<Referral | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateReferralBody>(INITIAL_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const page = Number(searchParams.get('page') || 1);
  const statusFilter = searchParams.get('status') || '';
  const destFilter = searchParams.get('destination_body') || '';
  const caseIdFilter = searchParams.get('frc_case_id') || '';

  const loadReferrals = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getReferrals({
        status: statusFilter || undefined,
        destination_body: destFilter || undefined,
        frc_case_id: caseIdFilter || undefined,
        page,
        page_size: 20,
      });
      const list = data.referrals || data.items || [];
      setReferrals(list);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load referrals');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, destFilter, caseIdFilter, page]);

  useEffect(() => {
    loadReferrals();
  }, [loadReferrals]);

  useEffect(() => {
    if (createModalOpen && caseIdFilter) {
      setFormData((f) => ({ ...f, frc_case_id: caseIdFilter }));
    }
  }, [createModalOpen, caseIdFilter]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page');
    router.push(`/referrals?${params.toString()}`);
  };

  const handleCreate = async () => {
    if (!formData.frc_case_id || !formData.reason || !formData.destination_body) {
      setCreateError('Case ID, destination, and reason are required.');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      await createReferral(formData);
      setCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      loadReferrals();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create referral');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReferralUpdate = (updated: Referral) => {
    setReferrals((prev) => prev.map((r) => r.referral_id === updated.referral_id ? updated : r));
    setSelectedReferral(updated);
  };

  return (
    <AppLayout title="Referral Tracking" subtitle="Monitor and manage case referrals to agencies">
      <div className="space-y-5">
        {/* Filters + Create */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select
              value={destFilter}
              onChange={(e) => updateParam('destination_body', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Destinations</option>
              {DESTINATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {caseIdFilter && (
              <div className="flex items-center gap-2 bg-cyan-600/20 border border-cyan-600/30 rounded-lg px-3 py-1.5">
                <span className="text-xs text-cyan-400 font-mono">Case: {caseIdFilter}</span>
                <button onClick={() => updateParam('frc_case_id', '')} className="text-cyan-400 hover:text-white text-xs">✕</button>
              </div>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
            >
              <Plus size={15} /> Create Referral
            </button>
          )}
        </div>

        {!isLoading && !error && (
          <p className="text-sm text-slate-400">
            <span className="text-slate-200 font-medium">{total}</span> referral{total !== 1 ? 's' : ''} tracked
          </p>
        )}

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={loadReferrals} />
        ) : referrals.length === 0 ? (
          <EmptyState title="No referrals found" description="No referrals match your current filters." />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Referral</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Case ID</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Destination</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Reason</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {referrals.map((ref) => (
                    <tr
                      key={ref.referral_id}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                      onClick={() => setSelectedReferral(ref)}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                            <Send size={13} className="text-emerald-400" />
                          </div>
                          <span className="text-slate-400 font-mono text-xs">{ref.referral_id.slice(0, 8)}…</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <Link
                          href={`/cases/${ref.frc_case_id}`}
                          className="text-cyan-400 font-mono text-sm hover:text-cyan-300 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {ref.frc_case_id}
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-slate-200 text-sm font-semibold">{ref.destination_body}</p>
                          <p className="text-slate-500 text-xs mt-0.5 hidden xl:block truncate max-w-32">{DESTINATION_LABELS[ref.destination_body]}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <ReferralStatusBadge status={ref.status} />
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell max-w-xs">
                        <p className="text-slate-400 text-sm truncate">{ref.reason}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm hidden xl:table-cell whitespace-nowrap">
                        {new Date(ref.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
                          Details <ArrowRight size={11} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 border-t border-slate-800">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPageChange={(p) => updateParam('page', String(p))} />
            </div>
          </div>
        )}
      </div>

      {/* Referral Detail Side Panel */}
      {selectedReferral && (
        <ReferralDetailPanel
          referral={selectedReferral}
          onClose={() => setSelectedReferral(null)}
          canUpdate={canCreate}
          onUpdate={handleReferralUpdate}
        />
      )}

      {/* Create Referral Modal */}
      <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateError(''); }} title="Create Referral" size="lg">
        <div className="space-y-4">
          {createError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">{createError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Case ID *</label>
              <input type="text" value={formData.frc_case_id} onChange={(e) => setFormData({ ...formData, frc_case_id: e.target.value })} placeholder="FRC-2026-XXXXX" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination Agency *</label>
              <select value={formData.destination_body} onChange={(e) => setFormData({ ...formData, destination_body: e.target.value as ReferralDestination })} className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500">
                {DESTINATIONS.map((d) => <option key={d} value={d}>{d} — {DESTINATION_LABELS[d]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Case Type</label>
              <input type="text" value={formData.case_type || ''} onChange={(e) => setFormData({ ...formData, case_type: e.target.value })} placeholder="e.g. money_laundering" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Routing Policy</label>
              <input type="text" value={formData.routing_policy || ''} onChange={(e) => setFormData({ ...formData, routing_policy: e.target.value })} placeholder="e.g. urgent, standard" className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Reason for Referral *</label>
              <textarea value={formData.reason} onChange={(e) => setFormData({ ...formData, reason: e.target.value })} rows={3} placeholder="Detailed reason for referring this case..." className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Additional Notes</label>
              <textarea value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2} placeholder="Any additional notes..." className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCreateModalOpen(false); setCreateError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button onClick={handleCreate} disabled={isCreating} className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2">
              {isCreating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create Referral
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default function ReferralsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <ReferralsPageContent />
    </Suspense>
  );
}
