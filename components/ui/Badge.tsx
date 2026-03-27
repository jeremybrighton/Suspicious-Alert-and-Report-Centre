import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'cyan';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: 'bg-slate-700 text-slate-300',
  success: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border border-red-500/30',
  info: 'bg-blue-500/20 text-blue-400 border border-blue-500/30',
  purple: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  cyan: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}>
      {children}
    </span>
  );
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export function CaseStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    received: 'cyan',
    under_review: 'warning',
    report_generated: 'purple',
    referred: 'info',
    closed: 'success',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
}

export function ReportStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    draft: 'default',
    under_review: 'warning',
    finalised: 'purple',
    sent: 'success',
  };
  return <Badge variant={map[status] || 'default'}>{status.replace('_', ' ')}</Badge>;
}

export function ReferralStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    pending: 'warning',
    sent: 'info',
    acknowledged: 'purple',
    closed: 'success',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
}

export function InstitutionStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    active: 'success',
    inactive: 'default',
    suspended: 'danger',
    pending: 'warning',
  };
  return <Badge variant={map[status] || 'default'}>{status}</Badge>;
}

export function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, BadgeVariant> = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    critical: 'danger',
  };
  return <Badge variant={map[priority] || 'default'}>{priority}</Badge>;
}
