import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Globe,
  MapPin,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth, type ThemePreference } from '../../context/AuthContext';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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

  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'security'>('profile');

  // Profile fields
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Security tab: password update
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setBusinessName(tenant?.businessName || '');
      setOwnerName(tenant?.ownerName || user?.fullName || '');
      setEmail(user?.email || tenant?.email || '');
      setMobileNumber((user?.mobileNumber || tenant?.mobileNumber || '').replace(/^\+?91/, ''));
      setAddress(tenant?.address || '');
      setCurrentPassword('');
      setNewPassword('');
      setShowPasswords(false);
      setActiveTab('profile');
    }
    wasOpenRef.current = open;
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
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (mobileNumber.trim() && cleanPhone.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
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
          address: address.trim() || null,
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      newPassword.length < 10 ||
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[^A-Za-z0-9]/.test(newPassword)
    ) {
      toast.error(
        'Strong password required: min 10 chars with uppercase, lowercase, number, and special character',
      );
      return;
    }
    setChangingPassword(true);
    try {
      await apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword },
      });
      toast.success('Password updated successfully');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update password');
    } finally {
      setChangingPassword(false);
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

  const passChecks = [
    { label: '10+ chars', ok: newPassword.length >= 10 },
    { label: 'Uppercase', ok: /[A-Z]/.test(newPassword) },
    { label: 'Lowercase', ok: /[a-z]/.test(newPassword) },
    { label: 'Number', ok: /[0-9]/.test(newPassword) },
    { label: 'Symbol', ok: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-w-xl w-full max-h-[90vh] overflow-hidden p-0 gap-0 dark:bg-[#0e0e11] dark:border-zinc-800">
        {/* Top Executive Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50/70 via-zinc-50 to-white dark:from-blue-950/30 dark:via-[#0e0e11] dark:to-[#09090b]">
          <div className="flex items-center gap-4 pr-8">
            <Avatar className="h-14 w-14 bg-blue-600 text-white shadow-md shadow-blue-600/20 ring-4 ring-white dark:ring-black shrink-0">
              <AvatarFallback className="text-lg font-bold bg-transparent text-white">
                {getInitials(tenant?.ownerName || user?.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="text-base sm:text-lg font-bold text-zinc-950 dark:text-white truncate">
                  {tenant?.businessName || t('profileTitle')}
                </DialogTitle>
                <Badge className="text-[10px] uppercase tracking-wide px-2 py-0 bg-blue-600/10 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {user?.role || 'owner'}
                </Badge>
                {user?.emailVerified ? (
                  <Badge className="text-[10px] px-2 py-0 bg-blue-600 text-white gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-2 py-0 text-zinc-600 border-zinc-300 dark:text-zinc-300 dark:border-zinc-700 gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Unverified
                  </Badge>
                )}
              </div>
              <DialogDescription className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 truncate">
                {tenant?.ownerName || user?.fullName} • {user?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Tabbed Body */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'profile' | 'preferences' | 'security')}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="px-6 pt-3 pb-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/70 dark:bg-black/40">
            <TabsList className="grid w-full grid-cols-3 h-9">
              <TabsTrigger value="profile" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <Building2 className="w-3.5 h-3.5" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="preferences" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <Globe className="w-3.5 h-3.5" />
                Appearance
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs font-semibold gap-1.5 cursor-pointer">
                <Shield className="w-3.5 h-3.5" />
                Security
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="overflow-y-auto px-6 py-5 max-h-[55vh]">
            {/* TAB 1: PROFILE & CENTRE DETAILS */}
            <TabsContent value="profile" className="mt-0 space-y-4">
              <form id="profile-details-form" onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-center" className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      {t('pucCenterName')} *
                    </Label>
                    <Input
                      id="prof-center"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Maruti PUC Center"
                      className="h-9 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof-owner" className="text-xs font-semibold flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      {t('ownerName')} *
                    </Label>
                    <Input
                      id="prof-owner"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Rajeshbhai Patel"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof-email" className="text-xs font-semibold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      {t('emailAddress')} *
                    </Label>
                    <Input
                      id="prof-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@example.com"
                      className="h-9 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="prof-mobile" className="text-xs font-semibold flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        {t('mobileNumber')}
                      </Label>
                      <span className="text-[10px] text-zinc-400">{t('optional')}</span>
                    </div>
                    <div className="flex">
                      <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-xs font-mono text-zinc-500">
                        +91
                      </span>
                      <Input
                        id="prof-mobile"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="98XXXXXXXX"
                        className="h-9 text-sm font-mono rounded-l-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="prof-address" className="text-xs font-semibold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Centre Location / Address
                  </Label>
                  <Input
                    id="prof-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shown in WhatsApp renewal reminders (e.g. Station Road, Rajkot)"
                    className="h-9 text-sm"
                  />
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: APPEARANCE & LANGUAGE */}
            <TabsContent value="preferences" className="mt-0 space-y-5">
              <div className="space-y-2.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t('theme')}
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { id: 'light', label: t('themeLight'), desc: 'Crisp white UI', icon: Sun },
                      { id: 'dark', label: 'Black', desc: 'Pure black UI', icon: Moon },
                      { id: 'system', label: 'System', desc: 'Sync with OS', icon: Monitor },
                    ] as { id: ThemePreference; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[]
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = theme === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => applyTheme(item.id)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-200'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs font-semibold mt-0.5">{item.label}</span>
                        <span
                          className={`text-[10px] ${
                            active ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-2.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  {t('language')}
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(
                    [
                      { code: 'en', label: 'English', sub: 'Default UI' },
                      { code: 'gu', label: 'ગુજરાતી', sub: 'Gujarati UI' },
                      { code: 'hi', label: 'हिंदी', sub: 'Hindi UI' },
                    ] as { code: Language; label: string; sub: string }[]
                  ).map((item) => {
                    const active = lang === item.code;
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => setLang(item.code)}
                        className={`flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                            : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-zinc-200'
                        }`}
                      >
                        <span className="text-xs font-semibold">{item.label}</span>
                        <span
                          className={`text-[10px] ${
                            active ? 'text-blue-100' : 'text-zinc-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </TabsContent>

            {/* TAB 3: SECURITY */}
            <TabsContent value="security" className="mt-0 space-y-5">
              <form id="profile-password-form" onSubmit={handleChangePassword} className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Update Account Password
                  </Label>
                  <button
                    type="button"
                    onClick={() => setShowPasswords((v) => !v)}
                    className="text-[11px] font-medium text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showPasswords ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    {showPasswords ? 'Hide' : 'Show'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Current password"
                    className="h-9 text-xs"
                    required
                  />
                  <Input
                    type={showPasswords ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New strong password (10+ chars)"
                    className="h-9 text-xs"
                    required
                    minLength={10}
                  />
                </div>

                {newPassword.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {passChecks.map((c) => (
                      <span
                        key={c.label}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                          c.ok
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800'
                        }`}
                      >
                        {c.ok ? '✓ ' : '• '}
                        {c.label}
                      </span>
                    ))}
                  </div>
                )}
              </form>
            </TabsContent>
          </div>
        </Tabs>

        {/* Sticky Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#09090b] flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={loggingOut}
            className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-900/60 dark:hover:bg-red-950/40 cursor-pointer"
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
              className="text-xs cursor-pointer"
            >
              {t('cancel')}
            </Button>

            {activeTab === 'profile' && (
              <Button
                type="submit"
                form="profile-details-form"
                size="sm"
                disabled={saving}
                className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? t('saving') : t('saveProfile')}
              </Button>
            )}

            {activeTab === 'security' && (
              <Button
                type="submit"
                form="profile-password-form"
                size="sm"
                disabled={changingPassword}
                className="gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5" />
                {changingPassword ? 'Updating...' : 'Update Password'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
