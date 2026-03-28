'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  FolderOpen,
  Scale,
  FileText,
  Send,
  ClipboardList,
  Users,
  LogOut,
  Shield,
  FlaskConical,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getToken, isDemoToken } from '@/lib/api';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    roles: ['frc_admin', 'frc_analyst', 'investigator', 'audit_viewer'],
  },
  {
    label: 'Cases',
    href: '/cases',
    icon: <FolderOpen size={18} />,
    roles: ['frc_admin', 'frc_analyst', 'investigator', 'audit_viewer'],
  },
  {
    label: 'Institutions',
    href: '/institutions',
    icon: <Building2 size={18} />,
    roles: ['frc_admin', 'frc_analyst'],
  },
  {
    label: 'Legal Rules',
    href: '/legal',
    icon: <Scale size={18} />,
    roles: ['frc_admin', 'frc_analyst', 'investigator', 'audit_viewer'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: <FileText size={18} />,
    roles: ['frc_admin', 'frc_analyst', 'investigator', 'audit_viewer'],
  },
  {
    label: 'Referrals',
    href: '/referrals',
    icon: <Send size={18} />,
    roles: ['frc_admin', 'frc_analyst', 'investigator', 'audit_viewer'],
  },
  {
    label: 'Audit Logs',
    href: '/audit-logs',
    icon: <ClipboardList size={18} />,
    roles: ['frc_admin', 'audit_viewer'],
  },
  {
    label: 'User Management',
    href: '/users',
    icon: <Users size={18} />,
    roles: ['frc_admin'],
  },
];

const ROLE_LABELS: Record<UserRole, string> = {
  frc_admin: 'Admin',
  frc_analyst: 'Analyst',
  investigator: 'Investigator',
  audit_viewer: 'Auditor',
};

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut, hasRole } = useAuth();
  const isDemo = typeof window !== 'undefined' && isDemoToken(getToken() || '');

  const visibleItems = NAV_ITEMS.filter((item) => hasRole(item.roles));

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col min-h-screen">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-600 flex items-center justify-center">
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">FRC Platform</p>
            <p className="text-slate-400 text-xs">Financial Intelligence</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                active
                  ? 'bg-cyan-600/20 text-cyan-400 font-medium'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span className={active ? 'text-cyan-400' : 'text-slate-500'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Demo mode banner */}
      {isDemo && (
        <div className="mx-3 mb-2 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
          <FlaskConical size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-amber-400">Demo Mode</p>
            <p className="text-xs text-amber-400/70 mt-0.5 leading-tight">
              No live data. Sign in with a real account to access the full system.
            </p>
          </div>
        </div>
      )}

      {/* User Info + Sign Out */}
      <div className="px-4 py-4 border-t border-slate-800">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium text-slate-200 truncate">{user?.full_name}</p>
          <span className="inline-block mt-1 text-xs bg-cyan-600/20 text-cyan-400 px-2 py-0.5 rounded-full">
            {user ? ROLE_LABELS[user.role] : ''}
          </span>
        </div>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
