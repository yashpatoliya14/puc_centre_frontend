import React, { useMemo, useState } from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { AppShell, type NavRoute } from './components/layout/AppShell';
import { DashboardView } from './views/DashboardView';
import { SettingsView } from './views/SettingsView';
import { getAppTheme } from './theme/theme';

function WorkspaceRouter() {
  const { isAuthenticated, theme } = useAuth();
  const [route, setRoute] = useState<NavRoute>('dashboard');

  const paletteMode = theme === 'light' ? 'light' : 'dark';
  const muiTheme = useMemo(() => getAppTheme(paletteMode), [paletteMode]);

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AuthScreen />
        <Toaster position="bottom-right" richColors theme={paletteMode} />
      </ThemeProvider>
    );
  }

  const renderView = () => {
    switch (route) {
      case 'dashboard':
        return <DashboardView onNavigate={setRoute} />;
      case 'settings-general':
        return <SettingsView />;
      default:
        return <DashboardView onNavigate={setRoute} />;
    }
  };

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <AppShell activeRoute={route} onNavigate={setRoute}>
        {renderView()}
      </AppShell>
      <Toaster position="bottom-right" richColors theme={paletteMode} />
    </ThemeProvider>
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
