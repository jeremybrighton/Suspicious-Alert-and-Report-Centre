'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ClipboardList, Search, ChevronDown, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { getAuditLogs } from '@/lib/api';
import type { AuditLog } from '@/types';

const MODULE_OPTIONS = ['auth', 'cases', 'reports', 'referrals', 'institutions', 'users', 'legal'];
const ACTION_OPTIONS = ['create', 'update', 'delete', 'login', 'logout', 'view', 'status_change'];

const ACTION_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'default'> = {
  create: 'success',
  update: 'warning',
  delete: 'danger',
  login: 'info',
  logout: 'default',
  view: 'cyan',
  status_change: 'purple' as 'warning',
};

function AuditLogsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const page = Number(searchParams.get('page') || 1);
  const moduleFilter = searchParams.get('module') || '';
  const actionFilter = searchParams.get('action') || '';
  const userIdFilter = searchParams.get('user_id') || '';
  const searchFilter = searchParams.get('search') || '';

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getAuditLogs({
        module: moduleFilter || undefined,
        action: actionFilter || undefined,
        user_id: userIdFilter || undefined,
        page,
        page_size: 30,
      });
      let list = data.logs || data.items || [];
      // Client-side search filter
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        list = list.filter(
          (l) =>
            l.module?.toLowerCase().includes(q) ||
            l.action?.toLowerCase().includes(q) ||
            l.user_name?.toLowerCase().includes(q) ||
            l.user_id?.toLowerCase().includes(q)
        );
      }
      setLogs(list);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [moduleFilter, actionFilter, userIdFilter, searchFilter, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page');
    router.push(`/audit-logs?${params.toString()}`);
  };

  const getActionColor = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'default' => {
    return ACTION_COLORS[action.toLowerCase()] || 'default';
  };

  return (
    <AppLayout
      title="Audit Logs"
      subtitle="System activity and user action history"
      allowedRoles={['frc_admin', 'audit_viewer']}
    >
      <div className="space-y-5">
        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchFilter}
                onChange={(e) => updateParam('search', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <select
              value={moduleFilter}
              onChange={(e) => updateParam('module', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Modules</option>
              {MODULE_OPTIONS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select
              value={actionFilter}
              onChange={(e) => updateParam('action', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Actions</option>
              {ACTION_OPTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
            <input
              type="text"
              placeholder="Filter by User ID..."
              value={userIdFilter}
              onChange={(e) => updateParam('user_id', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {!isLoading && !error && (
          <p className="text-sm text-slate-400">
            <span className="text-slate-200 font-medium">{total}</span> event{total !== 1 ? 's' : ''} logged
          </p>
        )}

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={loadLogs} />
        ) : logs.length === 0 ? (
          <EmptyState title="No audit logs found" description="No events match your current filters." />
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 w-8" />
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Timestamp</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Module</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Action</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">User</th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {logs.map((log) => (
                      <>
                        <tr
                          key={log.id}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                          onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                        >
                          <td className="px-3 py-3.5 text-center">
                            {expandedLog === log.id
                              ? <ChevronDown size={14} className="text-slate-400 mx-auto" />
                              : <ChevronRight size={14} className="text-slate-600 mx-auto" />
                            }
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-slate-200 text-sm font-mono">{new Date(log.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                            <p className="text-slate-500 text-xs font-mono">{new Date(log.created_at).toLocaleTimeString('en-KE')}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <ClipboardList size={13} className="text-slate-500" />
                              <span className="text-slate-300 text-sm capitalize">{log.module}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <Badge variant={getActionColor(log.action)}>
                              {log.action}
                            </Badge>
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <p className="text-slate-300 text-sm">{log.user_name || '—'}</p>
                            <p className="text-slate-500 text-xs font-mono mt-0.5">{log.user_id}</p>
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            <span className="text-slate-400 text-sm font-mono">{log.ip_address || '—'}</span>
                          </td>
                        </tr>
                        {expandedLog === log.id && log.details && (
                          <tr key={`${log.id}-details`} className="bg-slate-800/30">
                            <td colSpan={6} className="px-10 py-3">
                              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Event Details</p>
                              <pre className="text-xs text-slate-300 bg-slate-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={30} onPageChange={(p) => updateParam('page', String(p))} />
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <AuditLogsPageContent />
    </Suspense>
  );
}
