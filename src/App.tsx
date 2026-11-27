import React, { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell, type NavRoute } from './components/layout/AppShell';
import { GlobalLoader } from './components/ui/GlobalLoader';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { AdminView } from './views/AdminView';

function WorkspaceRouter() {
  const { isAuthenticated, loadingInitial, theme, user, tenant } = useAuth();
  const [route, setRoute] = useState<NavRoute>('dashboard');

  const paletteMode = theme === 'light' ? 'light' : 'dark';

  useEffect(() => {
    document.title = tenant?.businessName?.trim() || 'PUC Centre';
  }, [tenant?.businessName]);

  useEffect(() => {
    if (!isAuthenticated) {
      setRoute('dashboard');
    } else if (route === 'admin' && user?.role !== 'admin') {
      setRoute('dashboard');
    }
  }, [isAuthenticated, user?.id, user?.role, route]);

  if (loadingInitial) {
    return <GlobalLoader label="Loading workspace..." />;
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
