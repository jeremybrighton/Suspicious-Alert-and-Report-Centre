'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, AlertCircle, ChevronDown } from 'lucide-react';
import { login } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AuthUser } from '@/types';

const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@frc.go.ke', password: 'FRCAdmin2026!', role: 'Full access' },
  { label: 'Analyst', email: 'analyst@frc.go.ke', password: 'FRCAnalyst2026!', role: 'Cases & Reports' },
  { label: 'Investigator', email: 'investigator@frc.go.ke', password: 'FRCInvest2026!', role: 'View only' },
  { label: 'Auditor', email: 'auditor@frc.go.ke', password: 'FRCAudit2026!', role: 'Audit logs' },
];

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await login(email, password);
      const user: AuthUser = {
        user_id: res.user_id,
        full_name: res.full_name,
        role: res.role,
      };
      signIn(res.access_token, user);
      router.replace('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setShowDemo(false);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-cyan-600 mb-4 shadow-lg shadow-cyan-500/20">
            <Shield size={30} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">FRC Platform</h1>
          <p className="text-slate-400 text-sm mt-1">Financial Intelligence Processing System</p>
          <p className="text-slate-500 text-xs mt-0.5">Financial Reporting Centre of Kenya</p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-1">Sign in to your account</h2>
          <p className="text-slate-400 text-sm mb-6">Enter your FRC credentials to continue</p>

          {error && (
            <div className="flex items-center gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle size={15} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@frc.go.ke"
                autoComplete="email"
                required
                className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 py-2.5 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-4 py-2.5 pr-10 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/50 disabled:cursor-not-allowed text-white font-semibold rounded-lg py-2.5 text-sm transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo accounts selector */}
          <div className="mt-5 pt-5 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              <span>Use a demo account</span>
              <ChevronDown size={14} className={`transition-transform ${showDemo ? 'rotate-180' : ''}`} />
            </button>

            {showDemo && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => fillDemo(acc)}
                    className="text-left p-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-cyan-700 rounded-xl transition-all"
                  >
                    <p className="text-xs font-semibold text-cyan-400">{acc.label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{acc.role}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-xs mt-6">
          Financial Reporting Centre of Kenya &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
