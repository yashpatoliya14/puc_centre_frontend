import React, { useCallback, useEffect, useState } from 'react';
import {
  MessageSquare,
  Clock,
  Save,
  Info,
  Plus,
  Minus,
  X,
  Gauge,
  CalendarClock,
  Sliders,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { useI18n } from '../context/I18nContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';

interface SimplifiedSettings {
  callsEnabled: boolean;
  autoCallOnRegistration?: boolean;
  messagesEnabled: boolean;
  maxCallsPerCustomer: number;
  retryIntervalMinutes: number;
  maxMessagesPerCustomer: number;
  dailyMessageLimit: number;
  deliveryFrequency: string;
  deliveryFrequencyCount?: number;
  deliveryTimes?: string[];
  callingWindowStart: string;
  callingWindowEnd: string;
  remindDaysBefore: number[];
  remindDaysAfter: number[];
  businessName: string;
  ownerName: string;
  mobileNumber: string;
}

const AVAILABLE_DAYS_BEFORE = [
  { value: 30, label: '30d Before' },
  { value: 15, label: '15d Before' },
  { value: 7, label: '7d Before' },
  { value: 3, label: '3d Before' },
  { value: 1, label: '1d Before' },
];

const AVAILABLE_DAYS_AFTER = [
  { value: 1, label: '1d Overdue' },
  { value: 3, label: '3d Overdue' },
  { value: 7, label: '7d Overdue' },
  { value: 15, label: '15d Overdue' },
];

const DEFAULT_SLOT_TIMES = ['09:30', '13:00', '17:00', '19:00', '11:00', '15:00', '18:00', '20:00'];

export function SettingsView() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // WhatsApp Messaging Master Switch
  const [messagesEnabled, setMessagesEnabled] = useState(true);
  const [dailyLimitInput, setDailyLimitInput] = useState('100');
  const [frequencyCount, setFrequencyCount] = useState(1);
  const [deliveryTimes, setDeliveryTimes] = useState<string[]>(['10:00']);

  // Reminder Timeline
  const [remindDaysBefore, setRemindDaysBefore] = useState<number[]>([7, 3, 0]);
  const [remindDaysAfter, setRemindDaysAfter] = useState<number[]>([1, 3]);
  const [customBeforeInput, setCustomBeforeInput] = useState('');
  const [customAfterInput, setCustomAfterInput] = useState('');

  // Business Profile
  const [businessName, setBusinessName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [centreAddress, setCentreAddress] = useState('');

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiRequest<{
        simplified: SimplifiedSettings;
        general?: { address?: string };
      }>('/api/settings');
      const s = res.simplified;
      if (s) {
        setMessagesEnabled(s.messagesEnabled ?? true);
        setDailyLimitInput(String(s.dailyMessageLimit ?? 100));
        const count = Math.min(12, Math.max(1, s.deliveryFrequencyCount ?? 1));
        setFrequencyCount(count);
        const loadedTimes = Array.isArray(s.deliveryTimes) && s.deliveryTimes.length > 0
          ? s.deliveryTimes
          : ['10:00'];
        setDeliveryTimes(
          Array.from({ length: count }, (_, idx) => loadedTimes[idx] || DEFAULT_SLOT_TIMES[idx % DEFAULT_SLOT_TIMES.length]),
        );
        setRemindDaysBefore(s.remindDaysBefore || [7, 3, 0]);
        setRemindDaysAfter(s.remindDaysAfter || [1, 3]);
        setBusinessName(s.businessName || '');
        setOwnerName(s.ownerName || '');
        setMobileNumber(s.mobileNumber || '');
      }
      setCentreAddress(res.general?.address || '');
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

  const addCustomBeforeDay = () => {
    const num = parseInt(customBeforeInput, 10);
    if (Number.isNaN(num) || num < 1 || num > 365) {
      toast.error('Enter days between 1 and 365');
      return;
    }
    setRemindDaysBefore((prev) =>
      prev.includes(num) ? prev : [...prev, num].sort((a, b) => b - a),
    );
    setCustomBeforeInput('');
  };

  const addCustomAfterDay = () => {
    const num = parseInt(customAfterInput, 10);
    if (Number.isNaN(num) || num < 1 || num > 365) {
      toast.error('Enter days between 1 and 365');
      return;
    }
    setRemindDaysAfter((prev) =>
      prev.includes(num) ? prev : [...prev, num].sort((a, b) => a - b),
    );
    setCustomAfterInput('');
  };

  const updateFrequencyCount = (nextRaw: number) => {
    const count = Math.min(12, Math.max(1, Number.isNaN(nextRaw) ? 1 : nextRaw));
    setFrequencyCount(count);
    setDeliveryTimes((prev) =>
      Array.from(
        { length: count },
        (_, idx) => prev[idx] || DEFAULT_SLOT_TIMES[idx % DEFAULT_SLOT_TIMES.length],
      ),
    );
  };

  const updateDeliveryTime = (index: number, value: string) => {
    setDeliveryTimes((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSave = async () => {
    const parsedDaily = parseInt(dailyLimitInput, 10);
    if (Number.isNaN(parsedDaily) || parsedDaily < 1 || parsedDaily > 10000) {
      toast.error('Please enter a Daily Delivery Limit between 1 and 10000');
      return;
    }
    const safeDailyLimit = parsedDaily;
    const safeFreqCount = Math.min(12, Math.max(1, Number(frequencyCount) || 1));
    const safeTimes = Array.from(
      { length: safeFreqCount },
      (_, idx) => deliveryTimes[idx] || DEFAULT_SLOT_TIMES[idx % DEFAULT_SLOT_TIMES.length],
    );

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        callsEnabled: false,
        autoCallOnRegistration: false,
        messagesEnabled,
        maxCallsPerCustomer: 1,
        retryIntervalMinutes: 60,
        maxMessagesPerCustomer: 3,
        dailyMessageLimit: safeDailyLimit,
        deliveryFrequency: `${safeFreqCount}x_daily`,
        deliveryFrequencyCount: safeFreqCount,
        deliveryTimes: safeTimes,
        callingWindowStart: '09:30',
        callingWindowEnd: '19:30',
        remindDaysBefore,
        remindDaysAfter,
        businessName: businessName.trim() || undefined,
        ownerName: ownerName.trim() || undefined,
        mobileNumber: mobileNumber.trim() || undefined,
      };

      await apiRequest('/api/settings', {
        method: 'PUT',
        body: payload,
      });

      toast.success('Settings saved successfully');
      await loadSettings();
    } catch (err) {
      toast.error(t('saveFailed'), {
        description: err instanceof Error ? err.message : 'Please check input fields',
      });
    } finally {
      setSaving(false);
    }
  };

  const totalSchedulePoints = remindDaysBefore.length + remindDaysAfter.length;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded w-1/4" />
        <div className="h-28 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-xl" />
          <div className="h-72 bg-slate-100 dark:bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              {t('settingsTitle')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Configure WhatsApp reminders, daily delivery limits, frequency, and expiry schedule.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="h-9 px-4 gap-1.5 font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? t('saving') : 'Save Settings'}
        </Button>
      </div>

      {/* SECTION 1: MESSAGING STATUS & SUMMARY BAR */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                messagesEnabled
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  WhatsApp Renewal Reminders
                </h2>
                <Badge
                  variant={messagesEnabled ? 'default' : 'secondary'}
                  className={`text-[10px] px-2 py-0 ${
                    messagesEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {messagesEnabled ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Send WhatsApp PUC & Insurance renewal notifications to vehicle owners.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4 justify-between lg:justify-end">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 font-mono">
                {dailyLimitInput || '0'}/day
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700 font-mono">
                {frequencyCount} {frequencyCount === 1 ? 'time' : 'times'}/day
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700">
                {totalSchedulePoints} schedule rules
              </span>
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {messagesEnabled ? 'On' : 'Off'}
              </span>
              <Switch
                checked={messagesEnabled}
                onCheckedChange={setMessagesEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: DELIVERY LIMIT & REMINDER SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Delivery Limit Card */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Delivery Limit & Frequency
            </CardTitle>
            <CardDescription className="text-xs">
              Control daily message volume and reminder dispatch times.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-5 flex-1">
            {/* Daily Limit */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 space-y-2">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                Daily Delivery Limit
              </label>

              <Input
                type="number"
                min={1}
                max={10000}
                value={dailyLimitInput}
                onChange={(e) => setDailyLimitInput(e.target.value)}
                placeholder="Enter daily message limit (e.g. 100)"
                className="font-mono text-xs h-9 bg-white dark:bg-slate-950"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                Maximum WhatsApp reminders dispatched across your PUC centre per day.
              </span>
            </div>

            {/* Delivery Frequency + Customer Clock Time Slots */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                    Delivery Frequency
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block mt-0.5">
                    Set how many times per day to send reminders and pick each time from the clock.
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => updateFrequencyCount(frequencyCount - 1)}
                    disabled={frequencyCount <= 1}
                    className="h-8 w-8 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={frequencyCount}
                    onChange={(e) => updateFrequencyCount(parseInt(e.target.value, 10))}
                    className="w-14 h-8 text-center font-mono text-xs bg-white dark:bg-slate-950"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => updateFrequencyCount(frequencyCount + 1)}
                    disabled={frequencyCount >= 12}
                    className="h-8 w-8 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                {deliveryTimes.slice(0, frequencyCount).map((timeVal, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2.5 space-y-1"
                  >
                    <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-indigo-500" />
                      Time {idx + 1}
                    </label>
                    <Input
                      type="time"
                      value={timeVal}
                      onChange={(e) => updateDeliveryTime(idx, e.target.value)}
                      className="h-8 font-mono text-xs bg-transparent"
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reminder Schedule Card */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {t('cadenceTitle')}
            </CardTitle>
            <CardDescription className="text-xs">
              {t('cadenceDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4 flex-1">
            {/* Days Before Expiry */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-2.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {t('daysBeforeExpiry')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_DAYS_BEFORE.map((item) => {
                  const selected = remindDaysBefore.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleDayBefore(item.value)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-indigo-600 text-white dark:bg-indigo-500 dark:text-white border-transparent shadow-2xs'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
                {remindDaysBefore
                  .filter((d) => d > 0 && !AVAILABLE_DAYS_BEFORE.some((p) => p.value === d))
                  .map((customDay) => (
                    <button
                      key={customDay}
                      type="button"
                      onClick={() => toggleDayBefore(customDay)}
                      className="text-xs px-2.5 py-1 rounded-md font-medium bg-indigo-600 text-white inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Click to remove"
                    >
                      <span>{customDay}d Before</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={customBeforeInput}
                  onChange={(e) => setCustomBeforeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomBeforeDay();
                    }
                  }}
                  placeholder="Custom days before (e.g. 10)"
                  className="h-8 text-xs font-mono bg-white dark:bg-slate-950"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomBeforeDay}
                  className="h-8 px-2.5 text-xs gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>

            {/* On Expiry Day */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  On Expiry Day (0d)
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Send reminder on the exact certificate expiry date
                </span>
              </div>
              <Switch
                checked={remindDaysBefore.includes(0)}
                onCheckedChange={() => toggleDayBefore(0)}
              />
            </div>

            {/* Days After Expiry */}
            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-2.5">
              <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                {t('daysAfterExpiry')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_DAYS_AFTER.map((item) => {
                  const selected = remindDaysAfter.includes(item.value);
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => toggleDayAfter(item.value)}
                      className={`text-xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-amber-500 text-white border-transparent shadow-2xs'
                          : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
                {remindDaysAfter
                  .filter((d) => !AVAILABLE_DAYS_AFTER.some((p) => p.value === d))
                  .map((customDay) => (
                    <button
                      key={customDay}
                      type="button"
                      onClick={() => toggleDayAfter(customDay)}
                      className="text-xs px-2.5 py-1 rounded-md font-medium bg-amber-600 text-white inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                      title="Click to remove"
                    >
                      <span>{customDay}d Overdue</span>
                      <X className="w-3 h-3" />
                    </button>
                  ))}
              </div>
              <div className="flex items-center gap-2 max-w-xs">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={customAfterInput}
                  onChange={(e) => setCustomAfterInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomAfterDay();
                    }
                  }}
                  placeholder="Custom days after (e.g. 5)"
                  className="h-8 text-xs font-mono bg-white dark:bg-slate-950"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomAfterDay}
                  className="h-8 px-2.5 text-xs gap-1 shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: TEMPLATE PREVIEWS */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                WhatsApp Message Template Preview
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Read-only preview of the official Meta WhatsApp templates sent to vehicle owners.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-[11px] font-medium">
              Meta Approved Templates
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PUC Template Preview */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                PUC Renewal Reminder
              </span>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#e5ddd5]/30 dark:bg-slate-950 p-4 flex flex-col justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-bl-xs bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3.5 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    PUC Renewal Reminder
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {`Hello Yash,\n\nYour vehicle's PUC certificate for GJ01AB1234 is expiring on 08/12/2027.\n\nPlease renew your PUC certificate before the expiry date to avoid penalties.\n\n🏢 PUC Centre: ${businessName || 'Patel PUC'}\n👤 Owner Name: ${ownerName || 'Yash'}\n📍 Address: ${centreAddress || 'Rajkot'}\n📞 Contact Number: ${mobileNumber || '1234567890'}\n\nThank you for choosing.`}
                  </p>
                  <span className="text-[9px] text-slate-400 float-right mt-1.5 font-mono">
                    10:45 AM • Delivered
                  </span>
                </div>
              </div>
            </div>

            {/* Insurance Template Preview */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-slate-400" />
                Vehicle Insurance Renewal Reminder
              </span>
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-[#e5ddd5]/30 dark:bg-slate-950 p-4 flex flex-col justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-bl-xs bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 p-3.5 shadow-2xs">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">
                    Vehicle Insurance Renewal Reminder
                  </p>
                  <p className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                    {`Hello yash,\n\nYour vehicle GJ02GH1234 insurance policy is expiring on 12/08/2026.\n\n📄 Policy No.: 123\n🏢 Insurer: india\n\nRenew your policy on time to avoid a lapse in insurance coverage.\n\nFor Renewal Assistance:\n🏢 Centre: ${businessName || 'patel'}\n👤 Owner: ${ownerName || 'yash'}\n📞 Contact: ${mobileNumber || '1234526780'}\n\nThank you for your trust! 🙏`}
                  </p>
                  <span className="text-[9px] text-slate-400 float-right mt-1.5 font-mono">
                    11:15 AM • Delivered
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
