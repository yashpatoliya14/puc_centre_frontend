import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, setAuthToken, getAuthToken, setUnauthorizedHandler } from '../lib/api';

export type ThemePreference = 'dark' | 'light' | 'system';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  mobileNumber: string | null;
  role: string;
  emailVerified: boolean;
  themePreference: ThemePreference;
  lastLoginAt: string | null;
}

export interface AuthTenant {
  id: string;
  businessName: string;
  ownerName: string;
  mobileNumber: string;
  email: string;
  address: string | null;
  logoUrl: string | null;
  timezone: string;
  automationEnabled: boolean;
  defaultLanguage: string;
  defaultCallTime: string;
  callingWindowStart: string;
  callingWindowEnd: string;
}

export interface RuntimeInfo {
  telephonyMode: 'mock' | 'live' | string;
  telephonyProvider: string;
  databaseEngine: string;
  queueMode: string;
}

interface AuthResponse {
  token?: string;
  requiresVerification?: boolean;
  email?: string;
  message?: string;
  verificationToken?: string;
  user?: AuthUser;
  tenant?: AuthTenant;
  runtime?: RuntimeInfo;
}

interface AuthContextValue {
  user: AuthUser | null;
  tenant: AuthTenant | null;
  runtime: RuntimeInfo | null;
  theme: ThemePreference;
  isAuthenticated: boolean;
  loadingInitial: boolean;
  login: (email: string, password: string) => Promise<void>;
  demoLogin: () => Promise<void>;
  register: (payload: {
    businessName: string;
    ownerName: string;
    mobileNumber: string;
    email: string;
    password: string;
    address?: string;
    preloadSampleData?: boolean;
  }) => Promise<{ verificationToken?: string; requiresVerification?: boolean; email?: string; message?: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  applyTheme: (pref: ThemePreference, persist?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredTheme(): ThemePreference {
  try {
    const saved = localStorage.getItem('pucflow_theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // ignore storage access issues
  }
  return 'dark';
}

function resolveAndApplyDomTheme(pref: ThemePreference) {
  try {
    localStorage.setItem('pucflow_theme', pref);
  } catch {
    // ignore storage access issues
  }
  const root = document.documentElement;
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const shouldBeDark = pref === 'dark' || (pref === 'system' && prefersDark);
  root.classList.toggle('dark', shouldBeDark);
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('dark', shouldBeDark);
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tenant, setTenant] = useState<AuthTenant | null>(null);
  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);
  const [theme, setTheme] = useState<ThemePreference>(readStoredTheme);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    resolveAndApplyDomTheme(theme);
    if (theme === 'system') {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => resolveAndApplyDomTheme('system');
      media.addEventListener('change', handler);
      return () => media.removeEventListener('change', handler);
    }
  }, [theme]);

  const clearSession = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setTenant(null);
    setRuntime(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  const hydrate = useCallback((data: { user: AuthUser; tenant: AuthTenant; runtime: RuntimeInfo }) => {
    setUser(data.user);
    setTenant(data.tenant);
    setRuntime(data.runtime);
    const pref = (data.user.themePreference as ThemePreference) || 'dark';
    setTheme(pref);
    resolveAndApplyDomTheme(pref);
  }, []);

  // Restore authenticated session on page refresh (valid for 1 month)
  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      apiRequest<{ user: AuthUser; tenant: AuthTenant; runtime: RuntimeInfo }>('/api/auth/me')
        .then((res) => {
          hydrate(res);
        })
        .catch(() => {
          clearSession();
        })
        .finally(() => {
          setLoadingInitial(false);
        });
    } else {
      setLoadingInitial(false);
    }
  }, [hydrate, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (res.token && res.user && res.tenant && res.runtime) {
        setAuthToken(res.token);
        hydrate({ user: res.user, tenant: res.tenant, runtime: res.runtime });
      }
    },
    [hydrate],
  );

  const demoLogin = useCallback(async () => {
    const res = await apiRequest<AuthResponse>('/api/auth/demo-login', {
      method: 'POST',
    });
    if (res.token && res.user && res.tenant && res.runtime) {
      setAuthToken(res.token);
      hydrate({ user: res.user, tenant: res.tenant, runtime: res.runtime });
    }
  }, [hydrate]);

  const register = useCallback(
    async (payload: {
      businessName: string;
      ownerName: string;
      mobileNumber: string;
      email: string;
      password: string;
      address?: string;
      preloadSampleData?: boolean;
    }) => {
      const res = await apiRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: payload,
      });
      if (!res.requiresVerification && res.token && res.user && res.tenant && res.runtime) {
        setAuthToken(res.token);
        hydrate({ user: res.user, tenant: res.tenant, runtime: res.runtime });
      }
      return {
        verificationToken: res.verificationToken,
        requiresVerification: Boolean(res.requiresVerification),
        email: res.email,
        message: res.message,
      };
    },
    [hydrate],
  );

  const verifyEmail = useCallback(
    async (email: string, code: string) => {
      const res = await apiRequest<AuthResponse>('/api/auth/verify-email', {
        method: 'POST',
        body: { email, code },
      });
      if (res.token && res.user && res.tenant && res.runtime) {
        setAuthToken(res.token);
        hydrate({ user: res.user, tenant: res.tenant, runtime: res.runtime });
      }
    },
    [hydrate],
  );

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore network error on logout
    }
    clearSession();
  }, [clearSession]);

  const refreshProfile = useCallback(async () => {
    const res = await apiRequest<{ user: AuthUser; tenant: AuthTenant; runtime: RuntimeInfo }>('/api/auth/me');
    hydrate(res);
  }, [hydrate]);

  const applyTheme = useCallback(
    async (pref: ThemePreference, persist = true) => {
      setTheme(pref);
      resolveAndApplyDomTheme(pref);
      if (persist && user) {
        await apiRequest('/api/settings/appearance', {
          method: 'PUT',
          body: { themePreference: pref },
        });
        setUser((prev) => (prev ? { ...prev, themePreference: pref } : prev));
      }
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        runtime,
        theme,
        isAuthenticated: Boolean(user && tenant),
        loadingInitial,
        login,
        demoLogin,
        register,
        verifyEmail,
        logout,
        refreshProfile,
        applyTheme,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
