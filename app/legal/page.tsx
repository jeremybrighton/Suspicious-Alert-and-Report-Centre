'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Plus, Scale, BookOpen } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/Spinner';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import Badge from '@/components/ui/Badge';
import Pagination from '@/components/ui/Pagination';
import Modal from '@/components/ui/Modal';
import { getLegalRules, createLegalRule } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { LegalRule, LegalRuleType, CreateLegalRuleBody } from '@/types';

const RULE_TYPES: LegalRuleType[] = ['act', 'regulation', 'guideline', 'directive'];

const RULE_TYPE_COLORS: Record<LegalRuleType, string> = {
  act: 'info',
  regulation: 'purple',
  guideline: 'warning',
  directive: 'cyan',
};

const INITIAL_FORM: CreateLegalRuleBody = {
  rule_code: '',
  rule_type: 'act',
  act_name: '',
  section: '',
  summary: '',
  case_type: '',
  tag: '',
  destination_body: '',
};

function LegalRulesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { hasRole } = useAuth();
  const isAdmin = hasRole(['frc_admin']);

  const [rules, setRules] = useState<LegalRule[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRule, setExpandedRule] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formData, setFormData] = useState<CreateLegalRuleBody>(INITIAL_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const page = Number(searchParams.get('page') || 1);
  const search = searchParams.get('search') || '';
  const ruleTypeFilter = searchParams.get('rule_type') || '';
  const tagFilter = searchParams.get('tag') || '';

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await getLegalRules({
        search: search || undefined,
        rule_type: ruleTypeFilter || undefined,
        tag: tagFilter || undefined,
        page,
        page_size: 20,
      });
      const list = data.rules || data.items || [];
      setRules(list);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load legal rules');
    } finally {
      setIsLoading(false);
    }
  }, [search, ruleTypeFilter, tagFilter, page]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.delete('page');
    router.push(`/legal?${params.toString()}`);
  };

  const handleCreate = async () => {
    if (!formData.rule_code || !formData.act_name || !formData.summary) {
      setCreateError('Rule code, act name, and summary are required.');
      return;
    }
    setIsCreating(true);
    setCreateError('');
    try {
      await createLegalRule(formData);
      setCreateModalOpen(false);
      setFormData(INITIAL_FORM);
      loadRules();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppLayout title="Legal Rules" subtitle="Statutory references and legal framework">
      <div className="space-y-5">
        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search rules..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-52"
              />
            </div>
            <select
              value={ruleTypeFilter}
              onChange={(e) => updateParam('rule_type', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Types</option>
              {RULE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          {isAdmin && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-all"
            >
              <Plus size={15} /> Add Legal Rule
            </button>
          )}
        </div>

        {isLoading ? (
          <PageLoader />
        ) : error ? (
          <ErrorState message={error} onRetry={loadRules} />
        ) : rules.length === 0 ? (
          <EmptyState title="No legal rules found" description="No rules match your search criteria." />
        ) : (
          <>
            <p className="text-sm text-slate-400">
              <span className="text-slate-200 font-medium">{total}</span> rule{total !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.rule_code}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all"
                >
                  <button
                    className="w-full text-left px-5 py-4"
                    onClick={() => setExpandedRule(expandedRule === rule.rule_code ? null : rule.rule_code)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Scale size={16} className="text-cyan-400" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono font-semibold text-cyan-400">{rule.rule_code}</span>
                            <Badge variant={RULE_TYPE_COLORS[rule.rule_type] as 'info' | 'purple' | 'warning' | 'cyan'}>{rule.rule_type}</Badge>
                            {rule.tag && <Badge variant="default">{rule.tag}</Badge>}
                            {!rule.is_active && <Badge variant="danger">Inactive</Badge>}
                          </div>
                          <p className="text-sm font-semibold text-slate-200 truncate">{rule.act_name}</p>
                          {rule.section && <p className="text-xs text-slate-400 mt-0.5">{rule.section}</p>}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <span className={`text-slate-500 transition-transform inline-block ${expandedRule === rule.rule_code ? 'rotate-180' : ''}`}>▾</span>
                      </div>
                    </div>
                  </button>

                  {expandedRule === rule.rule_code && (
                    <div className="px-5 pb-5 border-t border-slate-800 pt-4">
                      <div className="flex gap-3">
                        <BookOpen size={15} className="text-slate-500 flex-shrink-0 mt-0.5" />
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Summary</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{rule.summary}</p>
                          </div>
                          {rule.case_type && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Case Type</p>
                              <p className="text-sm text-slate-300 capitalize">{rule.case_type?.replace(/_/g, ' ')}</p>
                            </div>
                          )}
                          {rule.destination_body && (
                            <div>
                              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Destination Body</p>
                              <p className="text-sm text-slate-300">{rule.destination_body}</p>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span>Added: {new Date(rule.created_at).toLocaleDateString('en-KE')}</span>
                            {rule.updated_at && <span>Updated: {new Date(rule.updated_at).toLocaleDateString('en-KE')}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={20}
              onPageChange={(p) => updateParam('page', String(p))}
            />
          </>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={createModalOpen} onClose={() => { setCreateModalOpen(false); setCreateError(''); }} title="Add Legal Rule" size="lg">
        <div className="space-y-4">
          {createError && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">{createError}</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Rule Code *</label>
              <input
                type="text"
                value={formData.rule_code}
                onChange={(e) => setFormData({ ...formData, rule_code: e.target.value })}
                placeholder="e.g. POCAMLA-S3"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Rule Type *</label>
              <select
                value={formData.rule_type}
                onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as LegalRuleType })}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {RULE_TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Act Name *</label>
              <input
                type="text"
                value={formData.act_name}
                onChange={(e) => setFormData({ ...formData, act_name: e.target.value })}
                placeholder="e.g. Proceeds of Crime and Anti-Money Laundering Act"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Section</label>
              <input
                type="text"
                value={formData.section || ''}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                placeholder="e.g. Section 3(1)"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Tag</label>
              <input
                type="text"
                value={formData.tag || ''}
                onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                placeholder="e.g. AML, CTF, corruption"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Case Type</label>
              <input
                type="text"
                value={formData.case_type || ''}
                onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                placeholder="e.g. suspicious_activity_report"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination Body</label>
              <input
                type="text"
                value={formData.destination_body || ''}
                onChange={(e) => setFormData({ ...formData, destination_body: e.target.value })}
                placeholder="e.g. DCI, KRA"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Summary *</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={4}
                placeholder="Brief legal summary of this rule..."
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => { setCreateModalOpen(false); setCreateError(''); }} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-4 py-2 text-sm bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              {isCreating && <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              Create Rule
            </button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

export default function LegalRulesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <LegalRulesPageContent />
    </Suspense>
  );
}
