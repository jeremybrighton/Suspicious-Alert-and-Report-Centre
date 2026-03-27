'use client';

import { Bell } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface TopbarProps {
  title: string;
  subtitle?: string;
}

export default function Topbar({ title, subtitle }: TopbarProps) {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 flex items-center justify-between px-6 sticky top-0 z-10">
      <div>
        <h1 className="text-white font-semibold text-lg leading-tight">{title}</h1>
        {subtitle && <p className="text-slate-400 text-xs">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <button className="text-slate-400 hover:text-slate-200 transition-colors relative">
          <Bell size={18} />
        </button>
        <div className="h-8 w-8 rounded-full bg-cyan-600 flex items-center justify-center text-white text-xs font-semibold">
          {user?.full_name?.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
