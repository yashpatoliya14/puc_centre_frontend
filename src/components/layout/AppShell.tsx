import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sliders,
  Menu,
  X,
  Sun,
  Moon,
  Radio,
  Car,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type Language } from '../../context/I18nContext';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ProfileModal } from './ProfilePopover';

export type NavRoute = 'dashboard' | 'settings-general';

interface AppShellProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  children: React.ReactNode;
}

export function AppShell({ activeRoute, onNavigate, children }: AppShellProps) {
  const { user, tenant, runtime, theme, applyTheme } = useAuth();
  const { lang, setLang, t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const isLive = runtime?.telephonyMode === 'live';

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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar: Desktop fixed & Mobile overlay */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col justify-between border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Brand Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Car className="h-5 w-5" />
            </div>
            <div>
              <div className="font-bold text-base text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                {t('appTitle')}
                <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold text-indigo-600 border-indigo-300 dark:text-indigo-400 dark:border-indigo-800">
                  v2.0
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
                {tenant?.businessName || 'PUC Center Automation'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Middle: Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Engine Status Card */}
          <div className="pt-4 px-2">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Radio className={`w-3 h-3 ${isLive ? 'text-emerald-500 animate-pulse' : 'text-indigo-500'}`} />
                  Telephony Engine
                </span>
                <Badge
                  variant={isLive ? 'success' : 'secondary'}
                  className="text-[10px] py-0 px-1.5"
                >
                  {isLive ? t('engineLive') : t('engineMock')}
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>TRAI Compliant: 09:30 - 19:30</span>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM-LEFT: User & PUC Center Profile Bar (Click opens Profile Modal) */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60">
          <button
            onClick={() => setProfileOpen(true)}
            title="Manage PUC Center Profile & Settings"
            className="w-full flex items-center justify-between p-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ring-2 ring-indigo-500/30">
                  <AvatarFallback className="text-xs font-bold">
                    {getInitials(tenant?.ownerName || user?.fullName)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {tenant?.businessName || 'PUC Center'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {tenant?.ownerName || user?.fullName || 'Center Owner'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                {activeRoute === 'dashboard' ? t('navDashboard') : t('navSettings')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tenant?.businessName ? `${tenant.businessName} • ` : ''}
                {t('liveStatus')}
              </p>
            </div>
          </div>

          {/* Right Header Controls: Language Switcher, Theme Toggle, Profile Trigger */}
          <div className="flex items-center gap-2">
            {/* Language Switcher Buttons */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
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
                  className={`px-2 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    lang === item.code
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
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
              className="rounded-lg border-slate-200 dark:border-slate-700"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-slate-600" />
              )}
            </Button>

            {/* Profile Avatar Pill in Top Bar */}
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Avatar className="h-7 w-7 text-xs font-bold bg-indigo-600 text-white">
                <AvatarFallback>{getInitials(tenant?.ownerName || user?.fullName)}</AvatarFallback>
              </Avatar>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 hidden md:inline truncate max-w-[120px]">
                {tenant?.ownerName || user?.fullName || 'Account'}
              </span>
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Profile Modal triggered by Bottom-Left Profile Bar */}
      <ProfileModal open={profileOpen} onOpenChange={setProfileOpen} />
    </div>
  );
}
