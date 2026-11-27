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
  Play,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { GlobalLoader } from '../components/ui/GlobalLoader';
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

interface WhatsAppLogItem {
  id: string;
  customer_name?: string;
  registration_number?: string;
  entity_type: 'puc' | 'insurance';
  dispatch_date_ist: string;
  slot_time: string;
  template_name: string;
  phone_number: string;
  status: 'sent' | 'failed';
  error_message?: string | null;
  created_at: string;
}

interface WhatsAppEngineSummary {
  messagesEnabled: boolean;
  sentToday: number;
  failedToday: number;
  frequencyCount: number;
  deliveryTimes: string[];
  todayIst: string;
  unlimited?: boolean;
}

interface SchedulePreviewRule {
  key: string;
  offset: number;
  label: string;
}

interface SchedulePreviewItem {
  id: string;
  customerId: string;
  customerName: string;
  mobileNumber: string;
  vehiclePlate: string;
  entityType: 'puc' | 'insurance';
  expiryDate: string;
  ruleKey: string;
  ruleLabel: string;
  offsetDays: number;
  scheduledDateIst: string;
  scheduledTimes: string[];
  daysUntilScheduled: number;
  status: 'sent' | 'not_sent' | 'failed' | 'paused';
  statusLabel: string;
  sentSlots: string[];
  lastSentAt: string | null;
  lastError: string | null;
}

export function SettingsView() {
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // WhatsApp Engine Live Status, Schedule Preview & Logs
  const [waSummary, setWaSummary] = useState<WhatsAppEngineSummary | null>(null);
  const [waLogs, setWaLogs] = useState<WhatsAppLogItem[]>([]);
  const [scheduleRules, setScheduleRules] = useState<SchedulePreviewRule[]>([]);
  const [scheduleItems, setScheduleItems] = useState<SchedulePreviewItem[]>([]);
  const [scheduleTodayIst, setScheduleTodayIst] = useState<string>('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [runningEngine, setRunningEngine] = useState(false);
  const [activityTab, setActivityTab] = useState<'schedule' | 'logs'>('schedule');
  const [ruleFilter, setRuleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'sent' | 'not_sent' | 'failed'>('all');
  const [scheduleSearch, setScheduleSearch] = useState('');

  // WhatsApp Messaging Master Switch
  const [messagesEnabled, setMessagesEnabled] = useState(true);
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

  const loadWhatsAppLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const [logsRes, previewRes] = await Promise.all([
        apiRequest<{
          ok: boolean;
          summary: WhatsAppEngineSummary;
          items: WhatsAppLogItem[];
        }>('/api/whatsapp/logs?limit=25'),
        apiRequest<{
          ok: boolean;
          todayIst: string;
          rules: SchedulePreviewRule[];
          items: SchedulePreviewItem[];
        }>('/api/whatsapp/schedule-preview'),
      ]);
      setWaSummary(logsRes.summary || null);
      setWaLogs(logsRes.items || []);
      setScheduleTodayIst(previewRes.todayIst || '');
      setScheduleRules(previewRes.rules || []);
      setScheduleItems(previewRes.items || []);
    } catch {
      // ignore initial log fetch error cleanly
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadWhatsAppLogs();
  }, [loadSettings, loadWhatsAppLogs]);

  const handleRunEngineNow = async (forceImmediate = false) => {
    setRunningEngine(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        sent: number;
        failed: number;
        skipped: number;
        deferredTime: number;
        limitReached: number;
      }>('/api/whatsapp/run-now', {
        method: 'POST',
        body: { forceImmediate },
      });
      if (res.sent > 0) {
        toast.success(`WhatsApp Engine dispatched ${res.sent} message(s)!`);
      } else if (res.deferredTime > 0 && !forceImmediate) {
        toast.info('Configured delivery time has not arrived yet');
      } else if (res.failed > 0) {
        toast.error(`WhatsApp Engine finished with ${res.failed} failed delivery(s)`);
      } else {
        toast.info('No pending due reminders matching today’s schedule');
      }
      await loadWhatsAppLogs();
    } catch (err) {
      toast.error('Failed to run WhatsApp Engine', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setRunningEngine(false);
    }
  };

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
        dailyMessageLimit: 10000,
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
      setTimeout(() => {
        loadWhatsAppLogs();
      }, 1500);
    } catch (err) {
      toast.error(t('saveFailed'), {
        description: err instanceof Error ? err.message : 'Please check input fields',
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredScheduleItems = scheduleItems.filter((item) => {
    if (ruleFilter === 'due_today' && item.daysUntilScheduled !== 0) return false;
    if (ruleFilter !== 'all' && ruleFilter !== 'due_today' && item.ruleKey !== ruleFilter) return false;

    if (statusFilter === 'sent' && item.status !== 'sent') return false;
    if (statusFilter === 'not_sent' && item.status !== 'not_sent' && item.status !== 'paused') return false;
    if (statusFilter === 'failed' && item.status !== 'failed') return false;

    const q = scheduleSearch.trim().toLowerCase();
    if (q) {
      return (
        item.customerName.toLowerCase().includes(q) ||
        item.mobileNumber.toLowerCase().includes(q) ||
        item.vehiclePlate.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return <GlobalLoader fullScreen={false} label="Loading settings..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600 dark:bg-blue-500 text-white flex items-center justify-center shrink-0 shadow-xs">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              {t('settingsTitle')}
            </h1>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="h-9 px-4 gap-1.5 font-semibold text-xs bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-400 shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? t('saving') : 'Save Settings'}
        </Button>
      </div>

      {/* SECTION 1: MESSAGING STATUS & SUMMARY BAR */}
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-2xs overflow-hidden">
        <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                messagesEnabled
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/80 dark:border-blue-900'
                  : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-400 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  WhatsApp Renewal Reminders
                </h2>
                <Badge
                  variant={messagesEnabled ? 'default' : 'secondary'}
                  className={`text-[10px] px-2 py-0 ${
                    messagesEnabled
                      ? 'bg-blue-600 hover:bg-blue-600 text-white'
                      : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
                  }`}
                >
                  {messagesEnabled ? 'Active' : 'Paused'}
                </Badge>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Send WhatsApp PUC & Insurance renewal notifications to vehicle owners.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {messagesEnabled ? 'On' : 'Off'}
            </span>
            <Switch
              checked={messagesEnabled}
              onCheckedChange={setMessagesEnabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: FREQUENCY, TIMING & REMINDER SCHEDULE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Delivery Frequency & Timing Card */}
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Delivery Frequency &amp; Timing
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-5 flex-1">
            {/* Delivery Frequency + Customer Clock Time Slots */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#0e0e11] p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <CalendarClock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                    Delivery Frequency
                  </label>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
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
                    className="w-14 h-8 text-center font-mono text-xs bg-white dark:bg-black"
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
                    className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black p-2.5 space-y-1"
                  >
                    <label className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-blue-500" />
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
        <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-2xs flex flex-col">
          <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              {t('cadenceTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 space-y-4 flex-1">
            {/* Days Before Expiry */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0e0e11] p-3.5 space-y-2.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
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
                          ? 'bg-blue-600 text-white dark:bg-blue-500 dark:text-white border-transparent shadow-2xs'
                          : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                      className="text-xs px-2.5 py-1 rounded-md font-medium bg-blue-600 text-white inline-flex items-center gap-1 cursor-pointer shadow-2xs"
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
                  className="h-8 text-xs font-mono bg-white dark:bg-black"
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
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0e0e11] p-3.5 flex items-center justify-between gap-3">
              <div>
                <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                  On Expiry Day (0d)
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Send reminder on the exact certificate expiry date
                </span>
              </div>
              <Switch
                checked={remindDaysBefore.includes(0)}
                onCheckedChange={() => toggleDayBefore(0)}
              />
            </div>

            {/* Days After Expiry */}
            <div className="rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-[#0e0e11] p-3.5 space-y-2.5">
              <label className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
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
                          ? 'bg-blue-500 text-white border-transparent shadow-2xs'
                          : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
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
                      className="text-xs px-2.5 py-1 rounded-md font-medium bg-blue-600 text-white inline-flex items-center gap-1 cursor-pointer shadow-2xs"
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
                  className="h-8 text-xs font-mono bg-white dark:bg-black"
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
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                WhatsApp Message Template Preview
              </CardTitle>
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
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-400" />
                PUC Renewal Reminder
              </span>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#e5ddd5]/30 dark:bg-black p-4 flex flex-col justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-bl-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 p-3.5 shadow-2xs">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    PUC Renewal Reminder
                  </p>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {`Hello Yash,\n\nYour vehicle's PUC certificate for GJ01AB1234 is expiring on 08/12/2027.\n\nPlease renew your PUC certificate before the expiry date to avoid penalties.\n\n🏢 PUC Centre: ${businessName || 'Patel PUC'}\n👤 Owner Name: ${ownerName || 'Yash'}\n📍 Address: ${centreAddress || 'Rajkot'}\n📞 Contact Number: ${mobileNumber || '1234567890'}\n\nThank you for choosing.`}
                  </p>
                  <span className="text-[9px] text-zinc-400 float-right mt-1.5 font-mono">
                    10:45 AM • Delivered
                  </span>
                </div>
              </div>
            </div>

            {/* Insurance Template Preview */}
            <div className="space-y-2">
              <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-zinc-400" />
                Vehicle Insurance Renewal Reminder
              </span>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-[#e5ddd5]/30 dark:bg-black p-4 flex flex-col justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-bl-xs bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 p-3.5 shadow-2xs">
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
                    Vehicle Insurance Renewal Reminder
                  </p>
                  <p className="text-xs text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {`Hello yash,\n\nYour vehicle GJ02GH1234 insurance policy is expiring on 12/08/2026.\n\n📄 Policy No.: 123\n🏢 Insurer: india\n\nRenew your policy on time to avoid a lapse in insurance coverage.\n\nFor Renewal Assistance:\n🏢 Centre: ${businessName || 'patel'}\n👤 Owner: ${ownerName || 'yash'}\n📞 Contact: ${mobileNumber || '1234526780'}\n\nThank you for your trust! 🙏`}
                  </p>
                  <span className="text-[9px] text-zinc-400 float-right mt-1.5 font-mono">
                    11:15 AM • Delivered
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 4: WHATSAPP ENGINE ACTIVITY & LOGS */}
      <Card className="border-zinc-200/80 dark:border-zinc-800 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                WhatsApp Engine Dispatch Status
                {waSummary && (
                  <Badge variant="outline" className="font-mono text-[11px] ml-1">
                    Sent Today: {waSummary.sentToday} (Unlimited)
                  </Badge>
                )}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadWhatsAppLogs}
                disabled={loadingLogs}
                className="h-8 text-xs gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => handleRunEngineNow(true)}
                disabled={runningEngine || !messagesEnabled}
                className="h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-400 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                {runningEngine ? 'Dispatching...' : 'Run Engine Now'}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* Sub-tabs: Scheduled Customer Queue vs Recent Logs */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActivityTab('schedule')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTab === 'schedule'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                Customer Schedule &amp; Status ({scheduleItems.length})
              </button>
              <button
                type="button"
                onClick={() => setActivityTab('logs')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activityTab === 'logs'
                    ? 'bg-blue-600 text-white dark:bg-blue-500'
                    : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                Dispatch History ({waLogs.length})
              </button>
            </div>
            {scheduleTodayIst && (
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Today (IST): {scheduleTodayIst} • Slots: {(waSummary?.deliveryTimes || deliveryTimes).join(', ')}
              </span>
            )}
          </div>

          {activityTab === 'schedule' ? (
            <div className="space-y-3">
              {/* Filter Bar: By Enabled Settings Rule + Sent / Not Sent + Search */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-zinc-50/80 dark:bg-[#0e0e11] p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800">
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 flex items-center gap-1 mr-1">
                      <Filter className="w-3 h-3" />
                      Settings Rule:
                    </span>
                    <button
                      type="button"
                      onClick={() => setRuleFilter('all')}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium border cursor-pointer transition-colors ${
                        ruleFilter === 'all'
                          ? 'bg-blue-600 text-white border-transparent'
                          : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      All Rules
                    </button>
                    <button
                      type="button"
                      onClick={() => setRuleFilter('due_today')}
                      className={`text-[11px] px-2.5 py-1 rounded-md font-medium border cursor-pointer transition-colors ${
                        ruleFilter === 'due_today'
                          ? 'bg-blue-600 text-white border-transparent'
                          : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      Due Today
                    </button>
                    {scheduleRules.map((rule) => (
                      <button
                        key={rule.key}
                        type="button"
                        onClick={() => setRuleFilter(rule.key)}
                        className={`text-[11px] px-2.5 py-1 rounded-md font-medium border cursor-pointer transition-colors ${
                          ruleFilter === rule.key
                            ? 'bg-blue-600 text-white border-transparent'
                            : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {rule.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mr-1">
                      Status:
                    </span>
                    {(
                      [
                        { id: 'all', label: 'All' },
                        { id: 'sent', label: 'Sent' },
                        { id: 'not_sent', label: 'Not Sent' },
                        { id: 'failed', label: 'Failed' },
                      ] as const
                    ).map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setStatusFilter(st.id)}
                        className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border cursor-pointer transition-colors ${
                          statusFilter === st.id
                            ? 'bg-zinc-900 text-white dark:bg-blue-500 dark:text-white border-transparent'
                            : 'bg-white dark:bg-black border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative w-full lg:w-64 shrink-0">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={scheduleSearch}
                    onChange={(e) => setScheduleSearch(e.target.value)}
                    placeholder="Filter customer, mobile, plate..."
                    className="h-8 pl-8 text-xs bg-white dark:bg-black"
                  />
                </div>
              </div>

              {filteredScheduleItems.length === 0 ? (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">
                  No customers match the selected Settings rule and status filter.
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-lg border border-zinc-200/80 dark:border-zinc-800 overflow-hidden max-h-[420px] overflow-y-auto">
                  {filteredScheduleItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white dark:bg-black"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-1.5">
                          <span>{item.customerName}</span>
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">
                            {item.vehiclePlate}
                          </span>
                          <Badge variant="outline" className="text-[10px]">
                            {item.entityType.toUpperCase()} • Exp: {item.expiryDate}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {item.ruleLabel}
                          </Badge>
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono flex flex-wrap items-center gap-2">
                          <span>{item.mobileNumber}</span>
                          <span>•</span>
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            Send on: {item.scheduledDateIst} @ {item.scheduledTimes.join(', ')} IST
                          </span>
                          {item.daysUntilScheduled === 0 && (
                            <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-sans font-semibold">
                              Today
                            </span>
                          )}
                          {item.lastError && <span className="text-red-500">({item.lastError})</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                        <Badge
                          variant={
                            item.status === 'sent'
                              ? 'default'
                              : item.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                          }
                          className={`text-[10px] ${
                            item.status === 'sent'
                              ? 'bg-blue-600 hover:bg-blue-600 text-white'
                              : item.status === 'not_sent' && item.daysUntilScheduled === 0
                                ? 'bg-blue-500 text-white hover:bg-blue-500'
                                : ''
                          }`}
                        >
                          {item.status === 'sent' ? `Sent (${item.sentSlots.join(', ')})` : item.statusLabel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : waLogs.length === 0 ? (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-6">
              No WhatsApp dispatches logged yet. Save your active delivery times or click “Run Engine Now” to dispatch matching due reminders.
            </p>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 rounded-lg border border-zinc-200/80 dark:border-zinc-800 overflow-hidden max-h-[420px] overflow-y-auto">
              {waLogs.map((log) => (
                <div key={log.id} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white dark:bg-black">
                  <div className="flex items-center gap-2.5">
                    {log.status === 'sent' ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    )}
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex flex-wrap items-center gap-1.5">
                        <span>{log.customer_name || 'Customer'}</span>
                        {log.registration_number && (
                          <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900">
                            {log.registration_number}
                          </span>
                        )}
                        <Badge variant="secondary" className="text-[10px]">
                          {log.entity_type.toUpperCase()} • {log.template_name}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 font-mono">
                        {log.phone_number} • Slot: {log.slot_time} ({log.dispatch_date_ist})
                        {log.error_message && <span className="text-red-500 ml-2">({log.error_message})</span>}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={log.status === 'sent' ? 'default' : 'destructive'}
                    className={`text-[10px] self-start sm:self-center ${
                      log.status === 'sent' ? 'bg-blue-600 hover:bg-blue-600 text-white' : ''
                    }`}
                  >
                    {log.status === 'sent' ? 'Sent' : 'Failed'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
