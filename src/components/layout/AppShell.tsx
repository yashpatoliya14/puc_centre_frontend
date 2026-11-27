import React, { useState } from 'react';
import {
  LayoutDashboard,
  Sliders,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { ProfileModal } from './ProfilePopover';

export type NavRoute = 'dashboard' | 'settings-general' | 'admin';

interface AppShellProps {
  activeRoute: NavRoute;
  onNavigate: (route: NavRoute) => void;
  children: React.ReactNode;
}

export function AppShell({ activeRoute, onNavigate, children }: AppShellProps) {
  const { user, tenant } = useAuth();
  const { t } = useI18n();
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
    ...(user?.role === 'admin'
      ? [
          {
            id: 'admin' as NavRoute,
            label: 'Admin Panel',
            icon: ShieldCheck,
          },
        ]
      : []),
  ];

  const handleNav = (route: NavRoute) => {
    onNavigate(route);
    setMobileOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black text-zinc-950 dark:text-zinc-50 flex flex-col md:flex-row antialiased">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen w-64 shrink-0 flex flex-col justify-between border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0c] transition-transform duration-200 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-sm tracking-tight shrink-0 shadow-xs">
              PF
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm text-zinc-950 dark:text-white leading-none truncate">
                {t('appTitle')}
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-1">
                {tenant?.businessName || 'PUC Center Platform'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-md cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          <div className="px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Indicator & Bottom-Left Profile Bar */}
        <div className="border-t border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-[#09090b] p-2 space-y-2">
          {/* Subtle Clean WhatsApp Status Pill */}
          <div className="px-2.5 py-1.5 flex items-center gap-2 rounded-lg bg-white dark:bg-[#111113] border border-zinc-200/80 dark:border-zinc-800 text-[11px] text-zinc-700 dark:text-zinc-300 font-medium">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600 dark:bg-blue-500" />
            </span>
            <span className="truncate">WhatsApp Engine Active</span>
          </div>

          {/* User Profile Card Button */}
          <button
            onClick={() => setProfileOpen(true)}
            title="Manage PUC Center Profile & Settings"
            className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-white dark:hover:bg-[#111113] border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 transition-colors cursor-pointer group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar className="h-8 w-8 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 font-bold text-xs ring-1 ring-zinc-200 dark:ring-zinc-800 shrink-0">
                <AvatarFallback>
                  {getInitials(tenant?.ownerName || user?.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-zinc-950 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                  {tenant?.businessName || 'PUC Center'}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                  {tenant?.ownerName || user?.fullName || 'Account Owner'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white shrink-0 ml-1 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-14 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0a0a0c] px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-1.5 rounded-md text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-950 dark:text-white">
                {activeRoute === 'dashboard'
                  ? t('navDashboard')
                  : activeRoute === 'admin'
                  ? 'Admin Panel'
                  : t('navSettings')}
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-500" />
                {t('liveStatus')}
              </span>
            </div>
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
