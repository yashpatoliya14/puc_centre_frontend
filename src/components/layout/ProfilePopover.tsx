import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Mail,
  Phone,
  Moon,
  Sun,
  Monitor,
  LogOut,
  Save,
  CheckCircle2,
  Globe,
  Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import { useI18n, type Language } from '../../context/I18nContext';
import { apiRequest } from '../../lib/api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface ProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function ProfileModal({ open, onOpenChange, trigger }: ProfileModalProps) {
  const { user, tenant, theme, applyTheme, logout, refreshProfile } = useAuth();
  const { lang, setLang, t } = useI18n();

  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Sync state whenever modal opens or user/tenant changes
  useEffect(() => {
    if (open) {
      setBusinessName(tenant?.businessName || '');
      setOwnerName(tenant?.ownerName || user?.fullName || '');
      setEmail(user?.email || tenant?.email || '');
      setMobileNumber(user?.mobileNumber || tenant?.mobileNumber || '');
    }
  }, [open, user, tenant]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error('Please enter your PUC Center Name');
      return;
    }
    if (!ownerName.trim()) {
      toast.error('Please enter Owner Name');
      return;
    }

    setSaving(true);
    try {
      await apiRequest('/api/settings/profile', {
        method: 'PUT',
        body: {
          businessName: businessName.trim(),
          ownerName: ownerName.trim(),
          fullName: ownerName.trim(),
          email: email.trim(),
          mobileNumber: mobileNumber.trim() || null,
        },
      });

      await refreshProfile();
      toast.success(t('profileSaved'));
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to update profile';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error logging out';
      toast.error(msg);
    } finally {
      setLoggingOut(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PC';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-md w-full max-h-[92vh] overflow-y-auto p-6">
        <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 ring-2 ring-indigo-500/20 bg-indigo-50 dark:bg-indigo-950/60">
              <AvatarFallback className="text-base font-bold text-indigo-600 dark:text-indigo-400">
                {getInitials(tenant?.ownerName || user?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="text-left">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                {t('profileTitle')}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {user?.role ? `${user.role.toUpperCase()} Account` : 'PUC Center Administrator'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* PUC Center Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('pucCenterName')}
            </label>
            <Input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Maruti Pollution Testing Center"
              className="text-sm font-medium"
              required
            />
          </div>

          {/* Owner Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('ownerName')}
            </label>
            <Input
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="e.g. Rajeshbhai Patel"
              className="text-sm font-medium"
              required
            />
          </div>

          {/* Email Address */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('emailAddress')}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@example.com"
              className="text-sm"
              required
            />
          </div>

          {/* Mobile Number (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                {t('mobileNumber')}
              </label>
              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-slate-500 border-slate-300">
                {t('optional')}
              </Badge>
            </div>
            <Input
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              placeholder="98XXXXXXXX (optional)"
              className="text-sm font-mono"
            />
          </div>

          {/* Language Switcher Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('language')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { code: 'en', label: 'English' },
                  { code: 'gu', label: 'ગુજરાતી' },
                  { code: 'hi', label: 'हिंदी' },
                ] as { code: Language; label: string }[]
              ).map((item) => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => setLang(item.code)}
                  className={`text-xs py-1.5 px-2 rounded-lg font-medium border transition-all cursor-pointer ${
                    lang === item.code
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dark / Light Mode Switcher */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('theme')}
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyTheme('light')}
                className={`flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg font-medium border transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                {t('themeLight')}
              </button>
              <button
                type="button"
                onClick={() => applyTheme('dark')}
                className={`flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg font-medium border transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5" />
                {t('themeDark')}
              </button>
              <button
                type="button"
                onClick={() => applyTheme('system')}
                className={`flex items-center justify-center gap-1 text-xs py-1.5 px-2 rounded-lg font-medium border transition-all cursor-pointer ${
                  theme === 'system'
                    ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                System
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleLogout}
              disabled={loggingOut}
              className="gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              {loggingOut ? t('loggingOut') : t('logout')}
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onOpenChange(false)}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="default"
                size="sm"
                disabled={saving}
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? t('saving') : t('saveProfile')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
