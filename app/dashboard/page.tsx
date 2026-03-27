'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  FolderOpen,
  FileText,
  Send,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Clock,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import { CaseStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { getCases, getInstitutions, getReports, getReferrals } from '@/lib/api';
import type { FRCCase } from '@/types';

interface DashboardStats {
  totalInstitutions: number;
  totalCases: number;
  casesUnderReview: number;
  reportsGenerated: number;
  referralsCreated: number;
}

function StatCard({
  title,
  value,
  icon,
  color,
  href,
  description,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  href: string;
  description?: string;
}) {
  return (
    <Link
      href={href}
      className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 hover:bg-slate-800/50 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <ArrowRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors mt-1" />
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm font-medium text-slate-300">{title}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </Link>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCases, setRecentCases] = useState<FRCCase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDashboard = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [institutionsData, casesData, casesUnderReview, reportsData, referralsData] =
        await Promise.all([
          getInstitutions(1, 1),
          getCases({ page: 1, page_size: 5 }),
          getCases({ status: 'under_review', page: 1, page_size: 1 }),
          getReports({ page: 1, page_size: 1 }),
          getReferrals({ page: 1, page_size: 1 }),
        ]);

      setStats({
        totalInstitutions: institutionsData.total || 0,
        totalCases: casesData.total || 0,
        casesUnderReview: casesUnderReview.total || 0,
        reportsGenerated: reportsData.total || 0,
        referralsCreated: referralsData.total || 0,
      });

      const casesList = casesData.cases || casesData.items || [];
      setRecentCases(casesList.slice(0, 5));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  return (
    <AppLayout title="Dashboard" subtitle="Financial Intelligence Processing System overview">
      {isLoading ? (
        <PageLoader />
      ) : error ? (
        <ErrorState message={error} onRetry={loadDashboard} />
      ) : (
        <div className="space-y-8">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-cyan-900/30 to-slate-900 border border-cyan-800/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp size={20} className="text-cyan-400" />
              <h2 className="text-lg font-semibold text-white">System Overview</h2>
            </div>
            <p className="text-slate-400 text-sm">
              Real-time summary of financial intelligence cases, reports, and referrals managed by the FRC platform.
            </p>
          </div>

          {/* KPI Cards */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Key Metrics</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <StatCard
                title="Total Institutions"
                value={stats?.totalInstitutions ?? 0}
                icon={<Building2 size={18} className="text-blue-400" />}
                color="bg-blue-500/15"
                href="/institutions"
                description="Registered reporting entities"
              />
              <StatCard
                title="Total Cases"
                value={stats?.totalCases ?? 0}
                icon={<FolderOpen size={18} className="text-cyan-400" />}
                color="bg-cyan-500/15"
                href="/cases"
                description="All incoming cases"
              />
              <StatCard
                title="Under Review"
                value={stats?.casesUnderReview ?? 0}
                icon={<AlertTriangle size={18} className="text-amber-400" />}
                color="bg-amber-500/15"
                href="/cases?status=under_review"
                description="Awaiting analyst action"
              />
              <StatCard
                title="Reports Generated"
                value={stats?.reportsGenerated ?? 0}
                icon={<FileText size={18} className="text-purple-400" />}
                color="bg-purple-500/15"
                href="/reports"
                description="Intelligence reports"
              />
              <StatCard
                title="Referrals Created"
                value={stats?.referralsCreated ?? 0}
                icon={<Send size={18} className="text-emerald-400" />}
                color="bg-emerald-500/15"
                href="/referrals"
                description="Cases referred to agencies"
              />
            </div>
          </div>

          {/* Recent Cases */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Cases</h3>
              </div>
              <Link
                href="/cases"
                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {recentCases.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
                <p className="text-slate-400 text-sm">No cases yet</p>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                        Case ID
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden md:table-cell">
                        Report Type
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3">
                        Status
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                        Priority
                      </th>
                      <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-5 py-3 hidden lg:table-cell">
                        Date
                      </th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {recentCases.map((c) => (
                      <tr key={c.frc_case_id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-5 py-3.5">
                          <span className="text-cyan-400 font-mono text-sm font-medium">
                            {c.frc_case_id}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 hidden md:table-cell">
                          <span className="text-slate-300 text-sm">
                            {c.report_type?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <CaseStatusBadge status={c.status} />
                        </td>
                        <td className="px-5 py-3.5 hidden lg:table-cell">
                          <PriorityBadge priority={c.priority} />
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-sm hidden lg:table-cell">
                          {new Date(c.created_at).toLocaleDateString('en-KE', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-5 py-3.5">
                          <Link
                            href={`/cases/${c.frc_case_id}`}
                            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                          >
                            View <ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
