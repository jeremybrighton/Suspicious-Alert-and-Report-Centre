'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, ArrowRight, Key } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { InstitutionStatusBadge } from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { getInstitutions, createInstitution, patchInstitutionStatus, generateApiKey } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Institution, InstitutionType, InstitutionStatus, CreateInstitutionBody } from '@/types';

const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: 'commercial_bank', label: 'Commercial Bank' },
  { value: 'sacco', label: 'SACCO' },
  { value: 'payment_service_provider', label: 'Payment Service Provider' },
  { value: 'digital_credit_provider', label: 'Digital Credit Provider' },
  { value: 'insurance_provider', label: 'Insurance Provider' },
  { value: 'microfinance_institution', label: 'Microfinance Institution' },
  { value: 'investment_bank', label: 'Investment Bank' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS: InstitutionStatus[] = ['active', 'inactive', 'suspended', 'pending'];

const INITIAL_FORM: CreateInstitutionBody = {
  institution_code: '',
  institution_name: '',
  institution_type: 'commercial_bank',
  supervisory_body: '',
  contact_email: '',
  status: 'active',
};

function InstitutionsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['frc_admin']);

  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateInstitutionBody>(INITIAL_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [apiKeyModal, setApiKeyModal] = useState<{ open: boolean; key: string }>({ open: false, key: '' });
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || 1);
  const statusFilter = searchParams.get('status') || '';
  const typeFilter = searchParams.get('institution_type') || '';

  const loadInstitutions = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getInstitutions(page, 20, statusFilter || undefined, typeFilter || undefined);
      const list = data.institutions || data.items || [];
      setInstitutions(list);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load institutions');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter, typeFilter]);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page');
    router.push(`/institutions?${params.toString()}`);
  };

  const handleCreate = async () => {
    if (!formData.institution_name || !formData.institution_code || !formData.contact_email) {
      setCreateError('Please fill in all required fields.');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      await createInstitution(formData);
      setCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      loadInstitutions();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create institution');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (inst: Institution) => {
    const next: InstitutionStatus = inst.status === 'active' ? 'inactive' : 'active';
    try {
      await patchInstitutionStatus(inst.id, next);
      loadInstitutions();
    } catch {
      // silent
    }
  };

  const handleGenerateKey = async (id: string) => {
    setGeneratingKey(id);
    try {
      const res = await generateApiKey(id);
      setApiKeyModal({ open: true, key: res.api_key });
    } catch {
      // silent
    } finally {
      setGeneratingKey(null);
    }
  };

  return (
    <AppLayout
      title="Institutions"
      subtitle="Registered reporting institutions"
      allowedRoles={['frc_admin', 'frc_analyst']}
    >
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => updateParam('institution_type', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Types</option>
              {INSTITUTION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
            >
              <Plus size={15} /> Add Institution
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={loadInstitutions} />
        ) : institutions.length === 0 ? (
          <EmptyState title="No institutions found" description="No institutions match your filters." />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Institution</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Type</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Supervisory Body</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Contact</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {institutions.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="text-slate-200 font-medium text-sm">{inst.institution_name}</p>
                        <p className="text-slate-500 text-xs font-mono mt-0.5">{inst.institution_code}</p>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-slate-300 text-sm capitalize">{inst.institution_type?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell">
                        <span className="text-slate-300 text-sm">{inst.supervisory_body}</span>
                      </td>
                      <td className="px-5 py-4">
                        <InstitutionStatusBadge status={inst.status} />
                      </td>
                      <td className="px-5 py-4 hidden xl:table-cell">
                        <span className="text-slate-400 text-sm">{inst.contact_email}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleToggleStatus(inst)}
                                className="text-xs text-slate-400 hover:text-amber-400 transition-colors"
                                title="Toggle status"
                              >
                                {inst.status === 'active' ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleGenerateKey(inst.id)}
                                disabled={generatingKey === inst.id}
                                className="text-slate-400 hover:text-cyan-400 transition-colors"
                                title="Generate API Key"
                              >
                                <Key size={14} />
                              </button>
                            </>
                          )}
                          <Link
                            href={`/institutions/${inst.id}`}
                            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            View <ArrowRight size={11} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 border-t border-slate-800">
              <Pagination
                page={page}
                totalPages={totalPages}
                total={total}
                pageSize={20}
                onPageChange={(p) => updateParam('page', String(p))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Create Institution Modal */}
      <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateError(''); }} title="Add Institution" size="lg">
        <div className="space-y-4">
          {createError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">{createError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Institution Code *</label>
              <input
                type="text"
                value={formData.institution_code}
                onChange={(e) => setFormData({ ...formData, institution_code: e.target.value })}
                placeholder="e.g. CBK001"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Institution Name *</label>
              <input
                type="text"
                value={formData.institution_name}
                onChange={(e) => setFormData({ ...formData, institution_name: e.target.value })}
                placeholder="e.g. Demo Bank Ltd"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Institution Type *</label>
              <select
                value={formData.institution_type}
                onChange={(e) => setFormData({ ...formData, institution_type: e.target.value as InstitutionType })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Supervisory Body *</label>
              <input
                type="text"
                value={formData.supervisory_body}
                onChange={(e) => setFormData({ ...formData, supervisory_body: e.target.value })}
                placeholder="e.g. Central Bank of Kenya"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Contact Email *</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="compliance@institution.co.ke"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Initial Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as InstitutionStatus })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCreateModalOpen(false); setCreateError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {isCreating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create Institution
            </button>
          </div>
        </div>
      </Modal>

      {/* API Key Modal */}
      <Modal isOpen={apiKeyModal.open} onClose={() => setApiKeyModal({ open: false, key: '' })} title="API Key Generated">
        <div className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg px-4 py-3 text-sm">
            <strong>Important:</strong> This API key will only be shown once. Copy and store it securely.
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">API Key</label>
            <code className="block w-full bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg px-4 py-3 text-sm font-mono break-all">
              {apiKeyModal.key}
            </code>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => { navigator.clipboard.writeText(apiKeyModal.key); }}
              className="px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
            >
              Copy Key
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default function InstitutionsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <InstitutionsPageContent />
    </Suspense>
  );
}
