'use client';

import Sidebar from './Sidebar';
import Topbar from './Topbar';
import RouteGuard from './RouteGuard';
import type { UserRole } from '@/types';

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  allowedRoles?: UserRole[];
}

export default function AppLayout({ children, title, subtitle, allowedRoles }: AppLayoutProps) {
  return (
    <RouteGuard allowedRoles={allowedRoles}>
      <div className="flex h-screen overflow-hidden bg-slate-950">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar title={title} subtitle={subtitle} />
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
