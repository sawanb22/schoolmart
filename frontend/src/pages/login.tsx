import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import api from '@/api/client';
import { setUserSession } from '@/lib/auth-session';
import ForgotPasswordModal from '@/components/forgot-password-modal';
import AuthCardLayout from '@/components/common/AuthCardLayout';

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const verifiedSuccess = searchParams.get('verified') === 'true';

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAdminError, setIsAdminError] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent double submission

    setError('');
    setIsAdminError(false);
    setUnverifiedEmail('');

    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password.trim();

    if (!cleanEmail || !cleanPassword) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', {
        email: cleanEmail,
        password: cleanPassword,
      });

      // Strict client-side verification: reject admin users from customer login
      if (data.user?.role === 'admin') {
        setIsAdminError(true);
        setError('Administrator accounts cannot log in through the customer portal. Please sign in via the Admin Portal.');
        return;
      }

      setUserSession(data.accessToken, data.user);

      const redirectParam = searchParams.get('redirect');
      const targetUrl = redirectParam && !redirectParam.startsWith('/admin') ? redirectParam : '/my-account';

      navigate(targetUrl, { replace: true });
    } catch (err: any) {
      if (err.response?.data?.code === 'ADMIN_PORTAL_REQUIRED' || err.response?.status === 403 && err.response?.data?.error?.includes('Admin')) {
        setIsAdminError(true);
        setError(err.response?.data?.error || 'Administrator accounts cannot log in through the customer portal. Please sign in via the Admin Portal at /admin/login.');
      } else if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        setUnverifiedEmail(err.response?.data?.email || cleanEmail);
        setError(err.response?.data?.error || 'Please verify your email address before signing in.');
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else if (!err.response) {
        setError('Cannot reach server. Please check your connection or backend server.');
      } else {
        setError('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoToVerify = () => {
    navigate('/registration?step=otp', {
      state: {
        email: unverifiedEmail || formData.email.trim().toLowerCase(),
        password: formData.password.trim(),
        fromLogin: true,
        step: 'otp',
      },
    });
  };

  return (
    <>
      <AuthCardLayout
        title="Welcome back"
        subtitle="Sign in to your SchoolMart customer account"
        footer={
          <div className="space-y-4">
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/registration" className="font-semibold text-[#0a2463] hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        }
      >
        {verifiedSuccess && !error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-800">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-600" />
            <span>Email verified successfully! Please sign in with your password.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                required
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 bg-white"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                onBlur={(e) => setFormData((p) => ({ ...p, email: e.target.value.trim() }))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                required
                type={showPassword ? 'text' : 'password'}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="current-password"
                className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-slate-900 bg-white"
                placeholder="Your password"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-xs font-semibold text-[#0a2463] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3.5 space-y-2 leading-relaxed">
              <div className="flex items-start gap-2">
                {isAdminError && <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                <p>{error}</p>
              </div>

              {isAdminError && (
                <div className="pt-2">
                  <Link
                    to="/admin/login"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
                  >
                    Go to Admin Portal Sign In <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )}

              {unverifiedEmail && (
                <button
                  type="button"
                  onClick={handleGoToVerify}
                  className="inline-flex items-center gap-1 font-semibold text-[#0a2463] underline hover:text-[#1a3a8f] text-xs"
                >
                  Enter Verification Code <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-[#0a2463] text-white font-bold py-3.5 rounded-xl hover:bg-[#1a3a8f] transition-all active:scale-[0.99] shadow-md shadow-blue-900/10 disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </>
            ) : (
              <>
                Sign In <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </AuthCardLayout>

      <ForgotPasswordModal open={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
    </>
  );
};

export default Login;
