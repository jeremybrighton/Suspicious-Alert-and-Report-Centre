'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Filter, ArrowRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { CaseStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import { getCases } from '@/lib/api';
import type { FRCCase } from '@/types';

const STATUS_OPTIONS = ['', 'received', 'under_review', 'report_generated', 'referred', 'closed'];
const PRIORITY_OPTIONS = ['', 'low', 'medium', 'high', 'critical'];
const REPORT_TYPE_OPTIONS = ['', 'suspicious_activity_report', 'regulatory_threshold_report'];

function CasesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [cases, setCases] = useState<FRCCase[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const page = Number(searchParams.get('page') || 1);
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const reportType = searchParams.get('report_type') || '';
  const search = searchParams.get('search') || '';

  const loadCases = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getCases({
        status: status || undefined,
        priority: priority || undefined,
        report_type: reportType || undefined,
        page,
        page_size: 20,
      });
      const casesList = data.cases || data.items || [];
      // Client-side search filter by case ID
      const filtered = search
        ? casesList.filter((c) => c.frc_case_id.toLowerCase().includes(search.toLowerCase()))
        : casesList;
      setCases(filtered);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load cases');
    } finally {
      setIsLoading(false);
    }
  }, [status, priority, reportType, page, search]);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete('page');
    router.push(`/cases?${params.toString()}`);
  };

  return (
    <AppLayout title="Incoming Cases" subtitle="All cases received by the FRC platform">
      <div className="space-y-5">
        {/* Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-slate-400" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Case ID..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              />
            </div>
            <select
              value={status}
              onChange={(e) => updateParam('status', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => updateParam('priority', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Priorities</option>
              {PRIORITY_OPTIONS.filter(Boolean).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              value={reportType}
              onChange={(e) => updateParam('report_type', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Report Types</option>
              {REPORT_TYPE_OPTIONS.filter(Boolean).map((r) => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        {!isLoading && !error && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">{total}</span> case{total !== 1 ? 's' : ''} found
            </p>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={loadCases} />
        ) : cases.length === 0 ? (
          <EmptyState title="No cases found" description="Adjust your filters or check back later." />
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Case ID</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">Report Type</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Status</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">Priority</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">Summary</th>
                    <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden xl:table-cell">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {cases.map((c) => (
                    <tr key={c.frc_case_id} className="hover:bg-slate-800/40 transition-colors cursor-pointer">
                      <td className="px-5 py-4">
                        <span className="text-cyan-400 font-mono text-sm font-medium">{c.frc_case_id}</span>
                      </td>
                      <td className="px-5 py-4 hidden md:table-cell">
                        <span className="text-slate-300 text-sm capitalize">{c.report_type?.replace(/_/g, ' ')}</span>
                      </td>
                      <td className="px-5 py-4">
                        <CaseStatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-4">
                        <PriorityBadge priority={c.priority} />
                      </td>
                      <td className="px-5 py-4 hidden lg:table-cell max-w-xs">
                        <p className="text-slate-400 text-sm truncate">{c.summary || '—'}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-sm hidden xl:table-cell whitespace-nowrap">
                        {new Date(c.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-5 py-4">
                        <Link
                          href={`/cases/${c.frc_case_id}`}
                          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors whitespace-nowrap"
                        >
                          View <ArrowRight size={11} />
                        </Link>
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
    </AppLayout>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CasesPageContent />
    </Suspense>
  );
}
