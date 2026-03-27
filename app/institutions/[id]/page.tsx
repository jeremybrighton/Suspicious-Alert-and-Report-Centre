'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Mail, Shield, Calendar, Key, Edit2, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { InstitutionStatusBadge } from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { getInstitutionById, patchInstitutionStatus, generateApiKey, updateInstitution } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Institution, InstitutionStatus } from '@/types';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-3 border-b border-slate-800 last:border-0">
      <dt className="w-44 flex-shrink-0 text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</dt>
      <dd className="flex-1 text-sm text-slate-200">{value}</dd>
    </div>
  );
}

export default function InstitutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['frc_admin']);

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<InstitutionStatus>('active');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const [apiKeyModal, setApiKeyModal] = useState<{ open: boolean; key: string }>({ open: false, key: '' });
  const [generatingKey, setGeneratingKey] = useState(false);
  const [keyCopied, setKeyCopied] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSupervisory, setEditSupervisory] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const loadInstitution = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getInstitutionById(id);
      setInstitution(data);
      setNewStatus(data.status);
      setEditSupervisory(data.supervisory_body);
      setEditEmail(data.contact_email);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load institution');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInstitution();
  }, [id]);

  const handleStatusUpdate = async () => {
    setUpdatingStatus(true);
    try {
      const updated = await patchInstitutionStatus(id, newStatus);
      setInstitution(updated);
      setStatusModalOpen(false);
    } catch { /* silent */ }
    finally { setUpdatingStatus(false); }
  };

  const handleGenerateKey = async () => {
    setGeneratingKey(true);
    try {
      const res = await generateApiKey(id);
      setApiKeyModal({ open: true, key: res.api_key });
    } catch { /* silent */ }
    finally { setGeneratingKey(false); }
  };

  const handleEdit = async () => {
    setIsEditing(true);
    try {
      const updated = await updateInstitution(id, {
        supervisory_body: editSupervisory,
        contact_email: editEmail,
      });
      setInstitution(updated);
      setEditModalOpen(false);
    } catch { /* silent */ }
    finally { setIsEditing(false); }
  };

  const copyKey = () => {
    navigator.clipboard.writeText(apiKeyModal.key);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  };

  return (
    <AppLayout title="Institution Detail" subtitle={institution?.institution_name} allowedRoles={['frc_admin', 'frc_analyst']}>
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={loadInstitution} />
      ) : !institution ? null : (
        <div className="space-y-6 max-w-4xl">
          {/* Breadcrumb + Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/institutions" className="text-slate-400 hover:text-slate-200 transition-colors">
                <ArrowLeft size={18} />
              </Link>
              <div>
                <p className="text-xs text-slate-500">Institutions /</p>
                <h2 className="text-white font-semibold">{institution.institution_name}</h2>
              </div>
            </div>
            {isAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={handleGenerateKey}
                  disabled={generatingKey}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
                >
                  <Key size={14} /> {generatingKey ? 'Generating...' : 'Generate API Key'}
                </button>
                <button
                  onClick={() => setStatusModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
                >
                  <Shield size={14} /> Update Status
                </button>
              </div>
            )}
          </div>

          {/* Details Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="h-14 w-14 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                <Building2 size={24} className="text-blue-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{institution.institution_name}</h3>
                <p className="text-slate-400 font-mono text-sm mt-0.5">{institution.institution_code}</p>
                <div className="mt-2">
                  <InstitutionStatusBadge status={institution.status} />
                </div>
              </div>
            </div>
            <dl>
              <InfoRow label="Institution Type" value={<span className="capitalize">{institution.institution_type?.replace(/_/g, ' ')}</span>} />
              <InfoRow label="Supervisory Body" value={institution.supervisory_body} />
              <InfoRow
                label="Contact Email"
                value={
                  <a href={`mailto:${institution.contact_email}`} className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 transition-colors">
                    <Mail size={13} /> {institution.contact_email}
                  </a>
                }
              />
              <InfoRow label="Status" value={<InstitutionStatusBadge status={institution.status} />} />
              <InfoRow label="Registered On" value={
                <span className="flex items-center gap-1.5 text-slate-300">
                  <Calendar size={13} /> {new Date(institution.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
              } />
              {institution.updated_at && (
                <InfoRow label="Last Updated" value={new Date(institution.updated_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })} />
              )}
            </dl>
          </div>

          {/* Quick links */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Related Data</h3>
            <div className="flex items-center gap-3">
              <Link
                href={`/cases?institution_id=${institution.id}`}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all"
              >
                View Cases from this Institution
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Status Modal */}
      <Modal isOpen={statusModalOpen} onClose={() => setStatusModalOpen(false)} title="Update Institution Status">
        <div className="space-y-4">
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as InstitutionStatus)}
            className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            {(['active', 'inactive', 'suspended', 'pending'] as InstitutionStatus[]).map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setStatusModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleStatusUpdate}
              disabled={updatingStatus}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {updatingStatus && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Update
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Institution">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Supervisory Body</label>
            <input
              type="text"
              value={editSupervisory}
              onChange={(e) => setEditSupervisory(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Contact Email</label>
            <input
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditModalOpen(false)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleEdit}
              disabled={isEditing}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {isEditing && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Save Changes
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
          <code className="block w-full bg-slate-800 border border-slate-700 text-emerald-400 rounded-lg px-4 py-3 text-sm font-mono break-all">
            {apiKeyModal.key}
          </code>
          <div className="flex justify-end">
            <button onClick={copyKey} className="flex items-center gap-2 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
              {keyCopied ? <><CheckCircle size={14} className="text-emerald-400" /> Copied!</> : 'Copy Key'}
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
