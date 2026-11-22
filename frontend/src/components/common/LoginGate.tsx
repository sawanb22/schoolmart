import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, Lock, UserPlus } from 'lucide-react';
import { isUserLoggedIn } from '@/lib/auth-session';
import { withRedirect } from '@/lib/safe-redirect';

/**
 * Tracks whether a user session exists and builds login / registration links
 * that return the visitor to the current page afterwards. Re-checks on route
 * change, on `storage` events (login in another tab) and on `cm_auth_changed`
 * (login or logout in this tab).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRequireLogin() {
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState<boolean>(() => isUserLoggedIn());

  useEffect(() => {
    const sync = () => setLoggedIn(isUserLoggedIn());
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('cm_auth_changed', sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('cm_auth_changed', sync);
    };
  }, [location.pathname, location.search]);

  const current = `${location.pathname}${location.search}`;
  return {
    loggedIn,
    loginHref: withRedirect('/login', current),
    registerHref: withRedirect('/registration', current),
  };
}

interface LoginGateProps {
  title?: string;
  message?: string;
  children: ReactNode;
}

/**
 * Renders `children` for logged-in users. Everyone else sees a prompt to log
 * in or create an account instead of the wrapped form.
 */
export default function LoginGate({
  title = 'Please log in to continue',
  message = 'Create a free account or log in to fill this form.',
  children,
}: LoginGateProps) {
  const { loggedIn, loginHref, registerHref } = useRequireLogin();

  if (loggedIn) return <>{children}</>;

  return (
    <div
      data-testid="login-gate"
      className="mx-auto w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm sm:p-8"
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
        <Lock className="h-7 w-7 text-cm-blue" aria-hidden="true" />
      </div>
      <h3 className="text-xl font-bold text-cm-blue-dark">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{message}</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to={loginHref}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-cm-blue px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cm-blue-dark"
        >
          <LogIn className="h-4 w-4" aria-hidden="true" />
          Log in
        </Link>
        <Link
          to={registerHref}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-cm-blue px-5 py-2.5 text-sm font-semibold text-cm-blue transition-colors hover:bg-blue-50"
        >
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Create account
        </Link>
      </div>
    </div>
  );
}
