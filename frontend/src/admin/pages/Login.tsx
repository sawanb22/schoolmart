import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import api from '@/api/client';
import { syncAdminSession, isAdminLoggedIn } from '../lib/auth';
import AuthCardLayout from '@/components/common/AuthCardLayout';

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

  const handleSubmit = async (e: React.FormEvent) => {
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
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError(err.response?.data?.error || 'Access denied: Administrator privileges required. Non-admin users cannot log in here.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (!err.response) {
        setError('Cannot reach server. Please check your network connection.');
      } else {
        setError('Invalid administrator email or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardLayout
      badge="Admin Portal"
      badgeVariant="slate"
      title="Administrator Sign In"
      subtitle="Restricted access area. Authorized administrators only."
      footer={
        <div className="flex flex-col items-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Return to SchoolMart Store
          </Link>
          <p className="text-[11px] text-slate-400 font-medium">
            Protected Enterprise System • All access attempts are logged
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Admin Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              required
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="email"
              placeholder="admin@schoolmart.in"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all font-medium text-slate-900 bg-white"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              onBlur={(e) => setFormData((p) => ({ ...p, email: e.target.value.trim() }))}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              required
              type={showPassword ? 'text' : 'password'}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="current-password"
              placeholder="Enter your admin password"
              className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all font-medium text-slate-900 bg-white"
              value={formData.password}
              onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
          className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-slate-800 transition-all active:scale-[0.99] shadow-lg shadow-slate-900/20 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
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
    </AuthCardLayout>
  );
}
