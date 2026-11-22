import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import api from '@/api/client';
import { syncAdminSession, isAdminLoggedIn } from '../lib/auth';

interface ApiErrorResponse {
  response?: {
    status?: number;
    data?: {
      error?: string;
    };
  };
}

export default function AdminLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If already logged in as administrator, navigate directly to admin dashboard
  useEffect(() => {
    if (isAdminLoggedIn()) {
      const redirectParam = searchParams.get('redirect');
      const target = redirectParam && redirectParam.startsWith('/admin') ? redirectParam : '/admin/dashboard';
      navigate(target, { replace: true });
    }
  }, [navigate, searchParams]);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both your administrator email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/admin-login', {
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!data?.accessToken || data?.user?.role !== 'admin') {
        throw new Error('Unauthorized response from authentication server.');
      }

      syncAdminSession(data.accessToken, data.user);

      const redirectParam = searchParams.get('redirect');
      const targetUrl = redirectParam && redirectParam.startsWith('/admin') ? redirectParam : '/admin/dashboard';
      navigate(targetUrl, { replace: true });
    } catch (err: unknown) {
      const apiErr = err as ApiErrorResponse;
      if (apiErr.response?.status === 403) {
        setError(apiErr.response?.data?.error || 'Access denied: Administrator privileges required. Non-admin users cannot log in here.');
      } else if (apiErr.response?.data?.error) {
        setError(apiErr.response.data.error);
      } else if (!apiErr.response) {
        setError('Cannot reach server. Please check your network connection.');
      } else {
        setError('Invalid administrator email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#faf9f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* CampusMart Branding & Admin Portal Badge */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-block group transition-transform hover:scale-[1.02]">
            <div className="inline-flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-black text-base shadow-sm">
                CM
              </div>
              <div className="text-left">
                <span className="block text-2xl font-black text-stone-900 tracking-tight leading-none">
                  CampusMart
                </span>
                <span className="block text-[10px] font-bold text-stone-500 uppercase tracking-widest mt-1">
                  Institutional Management
                </span>
              </div>
            </div>
          </Link>
          <div className="mt-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-stone-100 text-stone-800 border border-stone-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1e3a8a]" />
              CampusMart Admin Portal
            </span>
          </div>
        </div>

        {/* Calm White Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-8 sm:p-10">
          <h1 className="text-2xl font-black text-stone-900 tracking-tight mb-1">
            Administrator Sign In
          </h1>
          <p className="text-xs text-stone-500 font-medium mb-6 leading-relaxed">
            Restricted access area. Authorized administrators only.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  required
                  type="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="email"
                  placeholder="admin@schoolmart.in"
                  className="w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] transition-all font-medium text-stone-900 bg-white"
                  value={formData.email}
                  onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                  onBlur={(e) => setFormData((p) => ({ ...p, email: e.target.value.trim() }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  autoComplete="current-password"
                  placeholder="Enter your admin password"
                  className="w-full pl-10 pr-11 py-3 border border-stone-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/10 focus:border-[#1e3a8a] transition-all font-medium text-stone-900 bg-white"
                  value={formData.password}
                  onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3.5 leading-relaxed">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold py-3.5 rounded-xl transition-all active:scale-[0.99] shadow-sm disabled:opacity-60 disabled:cursor-not-allowed text-sm cursor-pointer"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating Administrator…
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Sign In to Admin Portal
                </>
              )}
            </button>
          </form>

          {/* Calm Footer */}
          <div className="mt-6 pt-6 border-t border-stone-100 flex flex-col items-center gap-3 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Return to CampusMart Store
            </Link>
            <p className="text-[11px] text-stone-400 font-medium">
              Protected Enterprise System • All access attempts are logged
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
