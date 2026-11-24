import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  Clock,
  Save,
  CheckCircle2,
  Sparkles,
  Zap,
  Shield,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';

interface SimplifiedSettings {
  callsEnabled: boolean;
  autoCallOnRegistration?: boolean;
  messagesEnabled: boolean;
  maxCallsPerCustomer: number;
  retryIntervalMinutes: number;
  maxMessagesPerCustomer: number;
  callingWindowStart: string;
  callingWindowEnd: string;
  remindDaysBefore: number[];
  remindDaysAfter: number[];
  pucMessageTemplate: string;
  insuranceMessageTemplate: string;
  voiceScriptTemplate: string;
  businessName: string;
  ownerName: string;
  mobileNumber: string;
}

const AVAILABLE_DAYS_BEFORE = [
  { value: 15, label: '15d Before' },
  { value: 7, label: '7d Before' },
  { value: 3, label: '3d Before' },
  { value: 1, label: '1d Before' },
  { value: 0, label: 'On Expiry Day (0d)' },
];

const AVAILABLE_DAYS_AFTER = [
  { value: 1, label: '1d Overdue' },
  { value: 3, label: '3d Overdue' },
  { value: 7, label: '7d Overdue' },
];

const PLACEHOLDERS = [
  '{customer_name}',
  '{vehicle_number}',
  '{puc_expiry_date}',
  '{center_name}',
  '{center_mobile}',
];

export function SettingsView() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // WhatsApp Messaging Master Switch
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [maxMessages, setMaxMessages] = useState(3);

  // Reminder Timeline
  const [remindDaysBefore, setRemindDaysBefore] = useState<number[]>([7, 3, 0]);
  const [remindDaysAfter, setRemindDaysAfter] = useState<number[]>([1, 3]);

  // Templates
  const [pucTemplate, setPucTemplate] = useState('');
  const [insTemplate, setInsTemplate] = useState('');

  // Business Profile
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{ simplified: SimplifiedSettings }>('/api/settings');
      const s = res.simplified;
      if (s) {
        setMessagesEnabled(s.messagesEnabled ?? true);
        setMaxMessages(s.maxMessagesPerCustomer ?? 3);
        setRemindDaysBefore(s.remindDaysBefore || [7, 3, 0]);
        setRemindDaysAfter(s.remindDaysAfter || [1, 3]);
        setPucTemplate(s.pucMessageTemplate || '');
        setInsTemplate(s.insuranceMessageTemplate || '');
        setBusinessName(s.businessName || '');
        setOwnerName(s.ownerName || '');
        setMobileNumber(s.mobileNumber || '');
      }
    } catch (err) {
      toast.error('Failed to load settings', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleDayBefore = (val: number) => {
    setRemindDaysBefore((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val].sort((a, b) => b - a),
    );
  };

  const toggleDayAfter = (val: number) => {
    setRemindDaysAfter((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val].sort((a, b) => a - b),
    );
  };

  const insertPlaceholder = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    token: string,
  ) => {
    setter((prev) => `${prev} ${token}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Calls are explicitly disabled per user request
      const payload: Record<string, unknown> = {
        callsEnabled: false,
        autoCallOnRegistration: false,
        messagesEnabled,
        maxCallsPerCustomer: 1,
        retryIntervalMinutes: 60,
        maxMessagesPerCustomer: Number(maxMessages),
        callingWindowStart: '09:30',
        callingWindowEnd: '19:30',
        remindDaysBefore,
        remindDaysAfter,
        pucMessageTemplate: pucTemplate,
        insuranceMessageTemplate: insTemplate,
        businessName: businessName.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
      };

      await apiRequest('/api/settings', {
        method: 'PUT',
        body: payload,
      });

      toast.success('WhatsApp reminder settings saved successfully!');
      await loadSettings();
    } catch (err) {
      toast.error(t('saveFailed'), {
        description: err instanceof Error ? err.message : 'Please check input fields',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/3" />
        <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-xl" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      {/* Page Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            WhatsApp Automation Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure automated WhatsApp reminder templates, delivery limits, and renewal notification timelines.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          size="lg"
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shrink-0 gap-2 cursor-pointer shadow-md shadow-emerald-600/20"
        >
          <Save className="w-4 h-4" />
          {saving ? t('saving') : 'Save WhatsApp Settings'}
        </Button>
      </div>

      {/* SECTION 1: MASTER WHATSAPP SWITCH */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Primary Communication Channel
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Control automated WhatsApp messaging for PUC and Insurance renewals.
          </p>
        </div>

        <Card
          className={`border transition-all ${
            messagesEnabled
              ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
              : 'opacity-70'
          }`}
        >
          <CardHeader className="p-5 pb-3">
            <div className="flex items-center justify-between">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <Switch
                checked={messagesEnabled}
                onCheckedChange={setMessagesEnabled}
              />
            </div>
            <CardTitle className="text-base font-bold mt-3">
              Automated WhatsApp Reminders
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed">
              Sends formatted WhatsApp renewal messages directly to vehicle owners before and after expiry.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <Badge variant={messagesEnabled ? 'success' : 'secondary'} className="text-[11px] font-bold">
              {messagesEnabled ? 'Active (WhatsApp Reminders ON)' : 'Disabled'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: LIMITS & TIMELINE CADENCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Limits Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Messaging Limits & Frequency
            </CardTitle>
            <CardDescription className="text-xs">
              Prevent spamming customers by capping reminder messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t('maxMessagesPerCustomer')}
              </label>
              <Input
                type="number"
                min={1}
                max={10}
                value={maxMessages}
                onChange={(e) => setMaxMessages(Number(e.target.value))}
                className="font-mono"
              />
              <span className="text-[11px] text-slate-400">
                Recommended: 3 messages per certificate (Pre-expiry, On Expiry, Overdue)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Cadence Timeline Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t('cadenceTitle')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('cadenceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t('daysBeforeExpiry')}
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_DAYS_BEFORE.map((item) => {
                  const selected = remindDaysBefore.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleDayBefore(item.value)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all cursor-pointer ${
                        selected
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                {t('daysAfterExpiry')}
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_DAYS_AFTER.map((item) => {
                  const selected = remindDaysAfter.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleDayAfter(item.value)}
                      className={`text-xs px-3 py-1.5 rounded-full font-medium border transition-all cursor-pointer ${
                        selected
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: TEMPLATES & LIVE PREVIEW */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            WhatsApp Message Templates
          </CardTitle>
          <CardDescription className="text-xs">
            {t('templatesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="puc">
            <TabsList className="grid w-full grid-cols-2 max-w-sm">
              <TabsTrigger value="puc">PUC WhatsApp</TabsTrigger>
              <TabsTrigger value="insurance">Insurance WhatsApp</TabsTrigger>
            </TabsList>

            {/* PUC Template Tab */}
            <TabsContent value="puc" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('pucWhatsappTemplate')}
                    </label>
                    <span className="text-[11px] text-slate-400">Supports Markdown & Placeholders</span>
                  </div>
                  <Textarea
                    rows={8}
                    value={pucTemplate}
                    onChange={(e) => setPucTemplate(e.target.value)}
                    className="font-mono text-xs leading-relaxed"
                    placeholder="Enter WhatsApp template text..."
                  />

                  {/* Insert Placeholder Pills */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                      {t('availablePlaceholders')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PLACEHOLDERS.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => insertPlaceholder(setPucTemplate, token)}
                          className="text-[11px] bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-400 cursor-pointer"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-500" />
                    {t('livePreview')}
                  </span>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-950 bg-[#e5ddd5]/30 dark:bg-slate-950 p-4 min-h-[200px] flex flex-col justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-xs bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 shadow-xs">
                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {pucTemplate
                          ? pucTemplate
                              .replace(/\{customer_name\}/g, 'Rajesh Patel')
                              .replace(/\{vehicle_number\}/g, 'GJ01AB1234')
                              .replace(/\{puc_expiry_date\}/g, '28 Feb 2026')
                              .replace(/\{center_name\}/g, businessName || 'Maruti PUC Center')
                              .replace(/\{center_mobile\}/g, mobileNumber || '9876543210')
                          : 'Sample message preview will appear here...'}
                      </p>
                      <span className="text-[9px] text-slate-400 float-right mt-1 font-mono">
                        10:45 AM • Delivered
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Insurance Template Tab */}
            <TabsContent value="insurance" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('insuranceWhatsappTemplate')}
                    </label>
                  </div>
                  <Textarea
                    rows={8}
                    value={insTemplate}
                    onChange={(e) => setInsTemplate(e.target.value)}
                    className="font-mono text-xs leading-relaxed"
                  />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">
                      {t('availablePlaceholders')}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {PLACEHOLDERS.map((token) => (
                        <button
                          key={token}
                          type="button"
                          onClick={() => insertPlaceholder(setInsTemplate, token)}
                          className="text-[11px] bg-slate-100 dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 hover:border-emerald-400 cursor-pointer"
                        >
                          {token}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t('livePreview')}
                  </span>
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-950 bg-[#e5ddd5]/30 dark:bg-slate-950 p-4 min-h-[200px] flex flex-col justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-bl-xs bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3 shadow-xs">
                      <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {insTemplate
                          ? insTemplate
                              .replace(/\{customer_name\}/g, 'Rajesh Patel')
                              .replace(/\{vehicle_number\}/g, 'GJ01AB1234')
                              .replace(/\{center_name\}/g, businessName || 'Maruti PUC Center')
                              .replace(/\{center_mobile\}/g, mobileNumber || '9876543210')
                          : 'Insurance reminder preview...'}
                      </p>
                      <span className="text-[9px] text-slate-400 float-right mt-1 font-mono">
                        11:15 AM • Delivered
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Sticky Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
          <Shield className="w-4 h-4 text-emerald-500" />
          <span>All WhatsApp reminders are queued and dispatched safely to customers.</span>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          {saving ? t('saving') : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
