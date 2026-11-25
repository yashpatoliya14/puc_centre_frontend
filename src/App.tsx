import React, { useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell, type NavRoute } from './components/layout/AppShell';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { AdminView } from './views/AdminView';

function WorkspaceRouter() {
  const { isAuthenticated, loadingInitial, theme, user } = useAuth();
  const [route, setRoute] = useState<NavRoute>('dashboard');

  const paletteMode = theme === 'light' ? 'light' : 'dark';

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-slate-300 dark:border-slate-700 border-t-indigo-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthScreen />
        <Toaster position="bottom-right" richColors theme={paletteMode} />
      </>
    );
  }

  const renderView = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardView onNavigate={setRoute} />;
      case 'settings-general':
        return <SettingsView />;
      case 'admin':
        return user?.role === 'admin' ? <AdminView /> : <DashboardView onNavigate={setRoute} />;
      default:
        return <DashboardView onNavigate={setRoute} />;
    }
  };

  return (
    <>
      <AppShell activeRoute={route} onNavigate={setRoute}>
        {renderView()}
      </AppShell>
      <Toaster position="bottom-right" richColors theme={paletteMode} />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <I18nProvider>
        <WorkspaceRouter />
      </I18nProvider>
    </AuthProvider>
  );
}
