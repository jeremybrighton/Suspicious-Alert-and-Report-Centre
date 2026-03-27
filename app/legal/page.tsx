'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Scale,
  BookOpen,
  ArrowUpRight,
  MapPin,
  Tag,
  FileSearch,
  X,
} from 'lucide-react';
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

const RULE_TYPE_COLORS: Record<LegalRuleType, 'info' | 'purple' | 'warning' | 'cyan'> = {
  act: 'info',
  regulation: 'purple',
  guideline: 'warning',
  directive: 'cyan',
};

const RULE_TYPE_ICONS: Record<LegalRuleType, string> = {
  act: '⚖️',
  regulation: '📋',
  guideline: '📌',
  directive: '🔷',
};

const COMMON_TAGS = ['AML', 'CTF', 'corruption', 'sanctions', 'fraud', 'tax_evasion', 'reporting'];

const DESTINATION_LABELS: Record<string, string> = {
  FRC: 'Financial Reporting Centre',
  DCI: 'Directorate of Criminal Investigations',
  KRA: 'Kenya Revenue Authority',
  CBK: 'Central Bank of Kenya',
  EACC: 'Ethics and Anti-Corruption Commission',
  NIS: 'National Intelligence Service',
  ARA: 'Asset Recovery Agency',
  ANTI_TERROR: 'Anti-Terror Unit / NCTC',
  EGMONT: 'Egmont Group',
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

function RuleDetailPanel({ rule, onClose }: { rule: LegalRule; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-slate-900 border-l border-slate-700 h-full overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-mono font-semibold text-cyan-400">{rule.rule_code}</span>
              <Badge variant={RULE_TYPE_COLORS[rule.rule_type]}>{rule.rule_type}</Badge>
              {!rule.is_active && <Badge variant="danger">Inactive</Badge>}
            </div>
            <h2 className="text-base font-semibold text-white leading-tight">{rule.act_name}</h2>
            {rule.section && <p className="text-sm text-slate-400 mt-0.5">{rule.section}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-slate-400 hover:text-slate-200 transition-colors mt-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Legal Summary */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen size={15} className="text-slate-400" />
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Legal Summary</h3>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <p className="text-sm text-slate-200 leading-relaxed">{rule.summary}</p>
            </div>
          </div>

          {/* Case Type Mapping */}
          {rule.case_type && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileSearch size={15} className="text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Case Type Mapping</h3>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
                  <span className="text-sm text-slate-200 capitalize">{rule.case_type.replace(/_/g, ' ')}</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This rule applies to cases classified as <strong className="text-slate-400">{rule.case_type.replace(/_/g, ' ')}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Destination Mapping */}
          {rule.destination_body && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin size={15} className="text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Destination Mapping</h3>
              </div>
              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center gap-2 mb-1">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <ArrowUpRight size={14} className="text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{rule.destination_body}</p>
                    {DESTINATION_LABELS[rule.destination_body] && (
                      <p className="text-xs text-slate-400">{DESTINATION_LABELS[rule.destination_body]}</p>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Cases triggering this rule may be referred to <strong className="text-slate-400">{rule.destination_body}</strong>.
                </p>
              </div>
            </div>
          )}

          {/* Tag */}
          {rule.tag && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Tag size={15} className="text-slate-400" />
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Classification Tag</h3>
              </div>
              <Badge variant="cyan" className="text-sm px-3 py-1">{rule.tag}</Badge>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-slate-800 pt-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Metadata</h3>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Rule Type</dt>
                <dd className="text-slate-300 capitalize">{rule.rule_type}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Status</dt>
                <dd>{rule.is_active ? <span className="text-emerald-400">Active</span> : <span className="text-red-400">Inactive</span>}</dd>
              </div>
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Added</dt>
                <dd className="text-slate-300">{new Date(rule.created_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</dd>
              </div>
              {rule.updated_at && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Last Updated</dt>
                  <dd className="text-slate-300">{new Date(rule.updated_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'long', year: 'numeric' })}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Module connections */}
          <div className="bg-cyan-900/20 border border-cyan-800/30 rounded-xl p-4">
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">Module Connections</p>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                Case Detail — linked legal references section
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                Reports — legal basis and linked rule IDs
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 flex-shrink-0" />
                Referrals — destination body routing
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [selectedRule, setSelectedRule] = useState<LegalRule | null>(null);

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
    <AppLayout title="Legal Panel" subtitle="Statutory rules, acts, and regulatory references">
      <div className="space-y-5">
        {/* Info banner */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-start gap-3">
          <Scale size={18} className="text-cyan-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-slate-200">Structured Legal Reference System</p>
            <p className="text-xs text-slate-400 mt-0.5">
              All legal rules are structured records linked to cases, reports, and referrals.
              Click any rule to view full details including case type mapping and destination authority.
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search act name, section..."
                value={search}
                onChange={(e) => updateParam('search', e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-100 rounded-lg pl-9 pr-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 w-60"
              />
            </div>
            <select
              value={ruleTypeFilter}
              onChange={(e) => updateParam('rule_type', e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">All Types</option>
              {RULE_TYPES.map((t) => (
                <option key={t} value={t}>{RULE_TYPE_ICONS[t]} {t}</option>
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

        {/* Tag chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-500">Filter by tag:</span>
          {COMMON_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => updateParam('tag', tagFilter === tag ? '' : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                tagFilter === tag
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {tagFilter && !COMMON_TAGS.includes(tagFilter) && (
            <button
              onClick={() => updateParam('tag', '')}
              className="text-xs px-2.5 py-1 rounded-full border bg-cyan-600 border-cyan-500 text-white flex items-center gap-1"
            >
              {tagFilter} <X size={10} />
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
              {tagFilter && <span className="ml-1 text-cyan-400">— tagged &ldquo;{tagFilter}&rdquo;</span>}
            </p>

            {/* Rules grid */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {rules.map((rule) => (
                <div
                  key={rule.rule_code}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-cyan-800/50 hover:bg-slate-800/50 transition-all cursor-pointer group"
                  onClick={() => setSelectedRule(rule)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-base group-hover:border-cyan-700/50 transition-colors">
                        {RULE_TYPE_ICONS[rule.rule_type]}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-xs font-mono font-semibold text-cyan-400">{rule.rule_code}</span>
                          <Badge variant={RULE_TYPE_COLORS[rule.rule_type]}>{rule.rule_type}</Badge>
                          {rule.tag && <Badge variant="default">{rule.tag}</Badge>}
                          {!rule.is_active && <Badge variant="danger">Inactive</Badge>}
                        </div>
                        <p className="text-sm font-semibold text-slate-200 leading-tight">{rule.act_name}</p>
                        {rule.section && (
                          <p className="text-xs text-slate-400 mt-0.5">{rule.section}</p>
                        )}
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-slate-600 group-hover:text-cyan-400 flex-shrink-0 mt-1 transition-colors" />
                  </div>

                  {/* Summary preview */}
                  <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed pl-13">
                    {rule.summary}
                  </p>

                  {/* Footer metadata */}
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800">
                    {rule.case_type && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <FileSearch size={11} />
                        <span className="capitalize">{rule.case_type.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {rule.destination_body && (
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin size={11} />
                        <span>{rule.destination_body}</span>
                      </div>
                    )}
                    <span className="ml-auto text-xs text-slate-600">
                      {new Date(rule.created_at).toLocaleDateString('en-KE')}
                    </span>
                  </div>
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

      {/* Rule Detail Side Panel */}
      {selectedRule && (
        <RuleDetailPanel rule={selectedRule} onClose={() => setSelectedRule(null)} />
      )}

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
                  <option key={t} value={t}>{RULE_TYPE_ICONS[t]} {t}</option>
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
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Case Type Mapping</label>
              <input
                type="text"
                value={formData.case_type || ''}
                onChange={(e) => setFormData({ ...formData, case_type: e.target.value })}
                placeholder="e.g. suspicious_activity_report"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Destination Mapping</label>
              <input
                type="text"
                value={formData.destination_body || ''}
                onChange={(e) => setFormData({ ...formData, destination_body: e.target.value })}
                placeholder="e.g. DCI, KRA, EACC"
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Legal Summary *</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                rows={4}
                placeholder="Plain-language explanation of this legal provision..."
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
