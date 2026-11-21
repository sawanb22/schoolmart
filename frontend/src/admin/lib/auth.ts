export interface StoredUser {
    id: number;
    name: string;
    email: string;
    role: string;
    [key: string]: any;
}

const parseUser = (raw: string | null): StoredUser | null => {
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

/**
 * Returns the active admin user.
 * Prioritizes an explicit cm_admin_user in sessionStorage, then localStorage.
 * Falls back to cm_user if it carries role: 'admin'.
 */
export const getAdminUser = (): StoredUser | null => {
    const sessionAdminUser = parseUser(sessionStorage.getItem('cm_admin_user'));
    if (sessionAdminUser && sessionAdminUser.role === 'admin') {
        return sessionAdminUser;
    }

    const localAdminUser = parseUser(localStorage.getItem('cm_admin_user'));
    if (localAdminUser && localAdminUser.role === 'admin') {
        return localAdminUser;
    }

    const sessionUser = parseUser(sessionStorage.getItem('cm_user'));
    if (sessionUser && sessionUser.role === 'admin') {
        return sessionUser;
    }

    const localUser = parseUser(localStorage.getItem('cm_user'));
    if (localUser && localUser.role === 'admin') {
        return localUser;
    }

    return null;
};

/**
 * Returns the admin access token.
 * Only returns a token if an active admin user is present.
 * Prioritizes explicit cm_admin_token over generic cm_token to prevent
 * stale non-admin tokens from hijacking administrative requests.
 */
export const getAdminToken = (): string | null => {
    const user = getAdminUser();
    if (!user || user.role !== 'admin') {
        return null;
    }

    // 1. Explicit admin token in sessionStorage or localStorage
    const explicitAdminToken =
        sessionStorage.getItem('cm_admin_token') ||
        localStorage.getItem('cm_admin_token');
    if (explicitAdminToken) {
        return explicitAdminToken;
    }

    // 2. Generic token matching where the admin user was found
    const sessionUser = parseUser(sessionStorage.getItem('cm_user'));
    if (sessionUser && sessionUser.role === 'admin' && sessionStorage.getItem('cm_token')) {
        return sessionStorage.getItem('cm_token');
    }

    const localUser = parseUser(localStorage.getItem('cm_user'));
    if (localUser && localUser.role === 'admin' && localStorage.getItem('cm_token')) {
        return localStorage.getItem('cm_token');
    }

    return null;
};

export const isAdminLoggedIn = (): boolean => {
    const token = getAdminToken();
    const user = getAdminUser();
    return Boolean(token && user && user.role === 'admin');
};

/**
 * Returns the currently authenticated user in either session or local storage,
 * regardless of role. Used to detect standard users attempting to access admin routes.
 */
export const getCurrentUser = (): StoredUser | null => {
    return parseUser(sessionStorage.getItem('cm_user')) || parseUser(localStorage.getItem('cm_user'));
};

export const syncAdminSession = (token: string, user: StoredUser): void => {
    const userStr = JSON.stringify(user);
    sessionStorage.setItem('cm_admin_token', token);
    sessionStorage.setItem('cm_admin_user', userStr);

    localStorage.setItem('cm_admin_token', token);
    localStorage.setItem('cm_admin_user', userStr);

    // Synchronize to public customer session so TopBar and store recognize the logged-in administrator
    sessionStorage.setItem('cm_token', token);
    sessionStorage.setItem('cm_user', userStr);

    localStorage.setItem('cm_token', token);
    localStorage.setItem('cm_user', userStr);
};

export const clearAdminSession = (): void => {
    sessionStorage.removeItem('cm_admin_token');
    sessionStorage.removeItem('cm_admin_user');
    sessionStorage.removeItem('cm_token');
    sessionStorage.removeItem('cm_user');

    localStorage.removeItem('cm_admin_token');
    localStorage.removeItem('cm_admin_user');
    localStorage.removeItem('cm_token');
    localStorage.removeItem('cm_user');
};

/**
 * Ensures session synchronization between localStorage and sessionStorage.
 * If an admin session exists in either storage (e.g., from public /login),
 * it synchronizes both storages bidirectionally so neither is left stale or mismatched.
 */
export const ensureSessionSynced = (): void => {
    const user = getAdminUser();
    const token = getAdminToken();
    if (token && user && user.role === 'admin') {
        const userStr = JSON.stringify(user);
        if (sessionStorage.getItem('cm_admin_token') !== token) {
            sessionStorage.setItem('cm_admin_token', token);
        }
        if (sessionStorage.getItem('cm_admin_user') !== userStr) {
            sessionStorage.setItem('cm_admin_user', userStr);
        }
        if (sessionStorage.getItem('cm_token') !== token) {
            sessionStorage.setItem('cm_token', token);
        }
        if (sessionStorage.getItem('cm_user') !== userStr) {
            sessionStorage.setItem('cm_user', userStr);
        }

        if (localStorage.getItem('cm_admin_token') !== token) {
            localStorage.setItem('cm_admin_token', token);
        }
        if (localStorage.getItem('cm_admin_user') !== userStr) {
            localStorage.setItem('cm_admin_user', userStr);
        }
        if (localStorage.getItem('cm_token') !== token) {
            localStorage.setItem('cm_token', token);
        }
        if (localStorage.getItem('cm_user') !== userStr) {
            localStorage.setItem('cm_user', userStr);
        }
    }
};
