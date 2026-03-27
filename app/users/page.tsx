'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Plus, UserCheck, UserX, Edit2, Users } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { getUsers, createUser, updateUser, deleteUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { FRCUser, UserRole, CreateUserBody, UpdateUserBody } from '@/types';

const ROLE_OPTIONS: UserRole[] = ['frc_admin', 'frc_analyst', 'investigator', 'audit_viewer'];

const ROLE_LABELS: Record<UserRole, string> = {
  frc_admin: 'Admin',
  frc_analyst: 'Analyst',
  investigator: 'Investigator',
  audit_viewer: 'Auditor',
};

const ROLE_COLORS: Record<UserRole, 'danger' | 'info' | 'warning' | 'default'> = {
  frc_admin: 'danger',
  frc_analyst: 'info',
  investigator: 'warning',
  audit_viewer: 'default',
};

const INITIAL_CREATE: CreateUserBody = {
  email: '',
  full_name: '',
  password: '',
  role: 'frc_analyst',
};

function UserManagementPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState<FRCUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserBody>(INITIAL_CREATE);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [editModal, setEditModal] = useState<{ open: boolean; user: FRCUser | null }>({ open: false, user: null });
  const [editForm, setEditForm] = useState<UpdateUserBody>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');

  const [deactivateConfirm, setDeactivateConfirm] = useState<FRCUser | null>(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

  const page = Number(searchParams.get('page') || 1);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getUsers(page, 20);
      const list = data.users || data.items || [];
      setUsers(list);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleCreate = async () => {
    if (!createForm.email || !createForm.full_name || !createForm.password) {
      setCreateError('All fields are required.');
      return;
    }
    if (createForm.password.length < 8) {
      setCreateError('Password must be at least 8 characters.');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      await createUser(createForm);
      setCreateModalOpen(false);
      setCreateForm(INITIAL_CREATE);
      loadUsers();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsCreating(false);
    }
  };

  const openEdit = (u: FRCUser) => {
    setEditModal({ open: true, user: u });
    setEditForm({ full_name: u.full_name, role: u.role, is_active: u.is_active });
    setEditError('');
  };

  const handleEdit = async () => {
    if (!editModal.user) return;
    setIsEditing(true);
    setEditError('');
    try {
      await updateUser(editModal.user.id, editForm);
      setEditModal({ open: false, user: null });
      loadUsers();
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : 'Failed to update user');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateConfirm) return;
    setIsDeactivating(true);
    try {
      await deleteUser(deactivateConfirm.id);
      setDeactivateConfirm(null);
      loadUsers();
    } catch { /* silent */ }
    finally { setIsDeactivating(false); }
  };

  const updatePageParam = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/users?${params.toString()}`);
  };

  return (
    <AppLayout
      title="User Management"
      subtitle="FRC platform user accounts"
      allowedRoles={['frc_admin']}
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-400" />
            <p className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">{total}</span> user{total !== 1 ? 's' : ''} registered
            </p>
          </div>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
          >
            <Plus size={15} /> Add User
          </button>
        </div>

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={loadUsers} />
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="No user accounts registered." />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">User</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Role</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Joined</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-cyan-600/20 border border-cyan-600/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-400 text-sm font-semibold">
                              {u.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="text-slate-200 text-sm font-medium flex items-center gap-1.5">
                              {u.full_name}
                              {u.id === currentUser?.user_id && (
                                <span className="text-xs text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded-full">You</span>
                              )}
                            </p>
                            <p className="text-slate-500 text-xs mt-0.5">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge variant={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                      </td>
                      <td className="px-5 py-4">
                        {u.is_active ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 text-sm">
                            <UserCheck size={14} /> Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm">
                            <UserX size={14} /> Inactive
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm hidden lg:table-cell">
                        {new Date(u.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="text-slate-400 hover:text-cyan-400 transition-colors"
                            title="Edit user"
                          >
                            <Edit2 size={14} />
                          </button>
                          {u.id !== currentUser?.user_id && u.is_active && (
                            <button
                              onClick={() => setDeactivateConfirm(u)}
                              className="text-slate-400 hover:text-red-400 transition-colors"
                              title="Deactivate user"
                            >
                              <UserX size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-5 border-t border-slate-800">
              <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPageChange={updatePageParam} />
            </div>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateError(''); setCreateForm(INITIAL_CREATE); }} title="Add New User">
        <div className="space-y-4">
          {createError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">{createError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name *</label>
            <input
              type="text"
              value={createForm.full_name}
              onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
              placeholder="Jane Wanjiku"
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Email Address *</label>
            <input
              type="email"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              placeholder="jane@frc.go.ke"
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role *</label>
            <select
              value={createForm.role}
              onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as UserRole })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Password *</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                placeholder="Min 8 characters"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 pr-10 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs transition-colors"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCreateModalOpen(false); setCreateError(''); setCreateForm(INITIAL_CREATE); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {isCreating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create User
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={editModal.open} onClose={() => { setEditModal({ open: false, user: null }); setEditError(''); }} title="Edit User">
        <div className="space-y-4">
          {editError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">{editError}</div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Full Name</label>
            <input
              type="text"
              value={editForm.full_name || ''}
              onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Role</label>
            <select
              value={editForm.role || 'frc_analyst'}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })}
              className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is_active"
              checked={editForm.is_active ?? true}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="accent-cyan-500 h-4 w-4"
            />
            <label htmlFor="is_active" className="text-sm text-slate-300">Active account</label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setEditModal({ open: false, user: null }); setEditError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
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

      {/* Deactivate Confirm Modal */}
      <Modal isOpen={!!deactivateConfirm} onClose={() => setDeactivateConfirm(null)} title="Deactivate User" size="sm">
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Are you sure you want to deactivate <strong className="text-white">{deactivateConfirm?.full_name}</strong>?
            They will lose access to the FRC platform.
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setDeactivateConfirm(null)} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleDeactivate}
              disabled={isDeactivating}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {isDeactivating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Deactivate
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default function UserManagementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <UserManagementPageContent />
    </Suspense>
  );
}
