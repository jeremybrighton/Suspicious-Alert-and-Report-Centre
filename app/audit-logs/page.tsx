'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  ChevronRight,
  User,
  Activity,
  Clock,
  Shield,
} from 'lucide-react';
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
  status_change: 'warning',
  received: 'cyan',
  referred: 'info',
};

const MODULE_ICONS: Record<string, string> = {
  auth: '🔐',
  cases: '📁',
  reports: '📄',
  referrals: '📤',
  institutions: '🏦',
  users: '👤',
  legal: '⚖️',
};

// Extract a human-readable actor from the log
function getActor(log: AuditLog): string {
  if (log.user_name) return log.user_name;
  if (log.user_id) return `User ${log.user_id.slice(0, 8)}…`;
  return 'System';
}

// Extract target from details
function getTarget(log: AuditLog): string {
  if (!log.details) return '—';
  const d = log.details as Record<string, unknown>;
  if (d.frc_case_id) return `Case: ${d.frc_case_id}`;
  if (d.case_id) return `Case: ${d.case_id}`;
  if (d.report_id) return `Report: ${d.report_id}`;
  if (d.referral_id) return `Referral: ${d.referral_id}`;
  if (d.institution_id) return `Institution: ${d.institution_id}`;
  if (d.institution_name) return `${d.institution_name}`;
  if (d.user_id) return `User: ${d.user_id}`;
  if (d.target) return String(d.target);
  if (d.id) return `ID: ${d.id}`;
  return '—';
}

// Group logs by date
function groupByDate(logs: AuditLog[]): Record<string, AuditLog[]> {
  const groups: Record<string, AuditLog[]> = {};
  logs.forEach((log) => {
    const date = new Date(log.created_at).toLocaleDateString('en-KE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(log);
  });
  return groups;
}

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

  const getActionColor = (action: string): 'success' | 'warning' | 'danger' | 'info' | 'cyan' | 'default' =>
    ACTION_COLORS[action.toLowerCase()] || 'default';

  const groupedLogs = groupByDate(logs);

  return (
    <AppLayout
      title="Audit Logs"
      subtitle="Complete system activity trail for accountability and compliance"
      allowedRoles={['frc_admin', 'audit_viewer']}
    >
      <div className="space-y-5">
        {/* Info bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <Shield size={16} className="text-cyan-400 flex-shrink-0" />
          <p className="text-sm text-slate-400">
            All system actions are recorded for compliance. Logs show <strong className="text-slate-300">actor</strong>, <strong className="text-slate-300">action</strong>, <strong className="text-slate-300">target</strong>, and timestamp.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search actor, action, module..."
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
              {MODULE_OPTIONS.map((m) => (
                <option key={m} value={m}>{MODULE_ICONS[m] || '•'} {m}</option>
              ))}
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
            <span className="text-slate-200 font-medium">{total}</span> event{total !== 1 ? 's' : ''} recorded
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
            {/* Grouped by date */}
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date}>
                {/* Date header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Clock size={12} className="text-slate-500" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{date}</span>
                  </div>
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-xs text-slate-600">{dateLogs.length} event{dateLogs.length !== 1 ? 's' : ''}</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mb-4">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-800">
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 w-8" />
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                            <div className="flex items-center gap-1.5"><Clock size={11} /> Time</div>
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                            <div className="flex items-center gap-1.5"><User size={11} /> Actor</div>
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
                            <div className="flex items-center gap-1.5"><Activity size={11} /> Action</div>
                          </th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden md:table-cell">Module</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Target</th>
                          <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3 hidden xl:table-cell">IP</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {dateLogs.map((log) => (
                          <>
                            <tr
                              key={log.id}
                              className="hover:bg-slate-800/30 transition-colors cursor-pointer"
                              onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                            >
                              <td className="px-3 py-3 text-center">
                                {expandedLog === log.id
                                  ? <ChevronDown size={13} className="text-slate-400 mx-auto" />
                                  : <ChevronRight size={13} className="text-slate-700 mx-auto" />
                                }
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-slate-300 text-xs font-mono">
                                  {new Date(log.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="h-6 w-6 rounded-full bg-cyan-600/20 flex items-center justify-center flex-shrink-0">
                                    <span className="text-cyan-400 text-xs font-semibold">
                                      {getActor(log).charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-slate-200 text-sm truncate max-w-28">{getActor(log)}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <Badge variant={getActionColor(log.action)}>
                                  {log.action.replace(/_/g, ' ')}
                                </Badge>
                              </td>
                              <td className="px-4 py-3 hidden md:table-cell">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-base">{MODULE_ICONS[log.module] || '•'}</span>
                                  <span className="text-slate-300 text-sm capitalize">{log.module}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 hidden lg:table-cell">
                                <span className="text-slate-400 text-xs font-mono">{getTarget(log)}</span>
                              </td>
                              <td className="px-4 py-3 hidden xl:table-cell">
                                <span className="text-slate-500 text-xs font-mono">{log.ip_address || '—'}</span>
                              </td>
                            </tr>
                            {expandedLog === log.id && (
                              <tr key={`${log.id}-details`} className="bg-slate-800/20">
                                <td colSpan={7} className="px-6 py-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Actor</p>
                                      <p className="text-sm text-slate-200">{getActor(log)}</p>
                                      <p className="text-xs text-slate-500 font-mono mt-0.5">{log.user_id}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Action</p>
                                      <Badge variant={getActionColor(log.action)}>{log.action.replace(/_/g, ' ')}</Badge>
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Target</p>
                                      <p className="text-sm text-slate-200">{getTarget(log)}</p>
                                    </div>
                                  </div>
                                  {log.details && Object.keys(log.details).length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Event Details</p>
                                      <pre className="text-xs text-slate-300 bg-slate-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap border border-slate-800 max-h-48">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            )}
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}

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
