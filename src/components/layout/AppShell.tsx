import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sliders,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type Language } from '../../context/I18nContext';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import { ProfileModal } from './ProfilePopover';

export type NavRoute = 'dashboard' | 'settings-general';

interface AppShellProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  children: React.ReactNode;
}

export function AppShell({ activeRoute, onNavigate, children }: AppShellProps) {
  const { user, tenant, theme, applyTheme } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'PC';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const navItems = [
    {
      id: 'dashboard' as NavRoute,
      label: t('navDashboard'),
      icon: LayoutDashboard,
    },
    {
      id: 'settings-general' as NavRoute,
      label: t('navSettings'),
      icon: Sliders,
    },
  ];

  const handleNav = (route: NavRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center font-black text-sm tracking-tight shrink-0 shadow-xs">
              PF
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-slate-900 dark:text-white leading-none truncate">
                {t('appTitle')}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-1">
                {tenant?.businessName || 'PUC Center Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Indicator & Bottom-Left Profile Bar */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 p-2 space-y-2">
          {/* Subtle Clean WhatsApp Status Pill */}
          <div className="px-2.5 py-1.5 flex items-center gap-2 rounded-lg bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="truncate">WhatsApp Engine Active</span>
          </div>

          {/* User Profile Card Button */}
          <button
            onClick={() => setProfileOpen(true)}
            title="Manage PUC Center Profile & Settings"
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-slate-800 border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700/80 transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                <AvatarFallback>
                  {getInitials(tenant?.ownerName || user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {tenant?.businessName || 'PUC Center'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {tenant?.ownerName || user?.fullName || 'Account Owner'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 border-b border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {activeRoute === 'dashboard' ? t('navDashboard') : t('navSettings')}
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                {t('liveStatus')}
              </span>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 rounded-md p-0.5 border border-slate-200/60 dark:border-slate-700/60">
              {(
                [
                  { code: 'en', label: 'EN' },
                  { code: 'gu', label: 'ગુ' },
                  { code: 'hi', label: 'हि' },
                ] as { code: Language; label: string }[]
              ).map((item) => (
                <button
                  key={item.code}
                  onClick={() => setLang(item.code)}
                  title={`Switch language to ${item.code.toUpperCase()}`}
                  className={`px-2 py-0.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    lang === item.code
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Dark / Light Mode Toggle */}
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => applyTheme(theme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
              className="rounded-md border-slate-200/80 dark:border-slate-800 h-8 w-8"
            >
              {theme === 'dark' ? (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              )}
            </Button>

            {/* Profile Avatar Pill in Top Bar */}
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Avatar className="h-6 w-6 text-[10px] font-bold bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                <AvatarFallback>{getInitials(tenant?.ownerName || user?.fullName)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 hidden md:inline truncate max-w-[120px]">
                {tenant?.ownerName || user?.fullName || 'Account'}
              </span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Profile Modal */}
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
