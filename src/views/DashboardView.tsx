import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Car,
  PhoneCall,
  MessageSquare,
  Search,
  X,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Users,
  Edit2,
  Trash2,
  Phone,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  Sliders,
  Radio,
  Send,
  Building2,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { formatDateShort, todayIsoDate, addDaysIsoDate } from '../lib/utils';
import { useI18n } from '../context/I18nContext';
import type { NavRoute } from '../components/layout/AppShell';

import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { SelectInput } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Avatar, AvatarFallback } from '../components/ui/avatar';

export interface CustomerItem {
  id: string;
  fullName: string;
  mobileNumber: string;
  language: string;
  remindersEnabled: boolean;
  vehicle: {
    id: string;
    registrationNumber: string;
    vehicleType: string;
    fuelType: string;
    makeModel?: string | null;
  } | null;
  certificate: {
    id: string;
    certificateNumber: string | null;
    issueDate: string;
    expiryDate: string;
    status: 'active' | 'expiring_soon' | 'expired';
    daysUntilExpiry: number;
  } | null;
  insurance: {
    id: string | null;
    policyNumber: string;
    insuranceCompany: string;
    policyType: string;
    startDate: string;
    expiryDate: string;
    premiumAmount: number | null;
    daysUntilExpiry: number | null;
    status: 'active' | 'expiring_soon' | 'expired';
  } | null;
}

interface SettingsSummary {
  callsEnabled: boolean;
  messagesEnabled: boolean;
  maxCallsPerCustomer: number;
  maxMessagesPerCustomer: number;
  callingWindowStart: string;
  callingWindowEnd: string;
}

const COMMON_INSURERS = [
  'ICICI Lombard',
  'HDFC ERGO',
  'Bajaj Allianz',
  'Tata AIG',
  'New India Assurance',
  'National Insurance',
  'United India Insurance',
  'Oriental Insurance',
  'SBI General Insurance',
  'Go Digit General Insurance',
  'Acko General Insurance',
  'Reliance General Insurance',
  'Other',
];

/**
 * Authentic Indian Vehicle Registration Number Plate
 */
function IndianNumberPlate({ regNumber }: { regNumber: string }) {
  return (
    <div className="inline-flex items-stretch rounded-md border-[1.5px] border-slate-900 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden select-none">
      <div className="bg-[#003399] text-white px-1.5 py-0.5 flex flex-col items-center justify-center border-r border-white/20">
        <span className="text-[9px] font-black tracking-wider leading-none">IND</span>
      </div>
      <div className="px-2.5 py-1 flex items-center bg-white dark:bg-slate-900">
        <span className="font-mono font-extrabold text-xs tracking-wider text-slate-900 dark:text-slate-100 uppercase leading-none">
          {regNumber || '—'}
        </span>
      </div>
    </div>
  );
}

export function DashboardView({ onNavigate }: { onNavigate: (route: NavRoute) => void }) {
  const { t } = useI18n();

  const [customers, setCustomers] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'expiring' | 'expired' | 'insured'>('all');

  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(15);

  // Direct Exotel Call states
  const [callingId, setCallingId] = useState<string | null>(null);

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // WhatsApp dialog state
  const [whatsappCustomer, setWhatsappCustomer] = useState<CustomerItem | null>(null);
  const [whatsappType, setWhatsappType] = useState<'puc' | 'insurance'>('puc');
  const [whatsappPreview, setWhatsappPreview] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);

  // Customer modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Customer form inputs
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [language, setLanguage] = useState<'gu' | 'hi' | 'en'>('gu');
  const [regNumber, setRegNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('2-Wheeler');
  const [fuelType, setFuelType] = useState('Petrol');
  const [makeModel, setMakeModel] = useState('');
  const [issueDate, setIssueDate] = useState(todayIsoDate());
  const [expiryDate, setExpiryDate] = useState(addDaysIsoDate(todayIsoDate(), 180));
  const [certNumber, setCertNumber] = useState('');

  // Insurance form inputs
  const [hasInsurance, setHasInsurance] = useState(false);
  const [policyNumber, setPolicyNumber] = useState('');
  const [insuranceCompany, setInsuranceCompany] = useState('ICICI Lombard');
  const [customCompany, setCustomCompany] = useState('');
  const [policyType, setPolicyType] = useState('Comprehensive');
  const [insStartDate, setInsStartDate] = useState(todayIsoDate());
  const [insExpiryDate, setInsExpiryDate] = useState(addDaysIsoDate(todayIsoDate(), 365));
  const [premiumAmount, setPremiumAmount] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [custList, settRes] = await Promise.all([
        apiRequest<{ items: CustomerItem[] }>('/api/customers?limit=250'),
        apiRequest<{ simplified?: SettingsSummary }>('/api/settings').catch(() => null),
      ]);
      setCustomers(custList.items || []);
      if (settRes?.simplified) {
        setSettings(settRes.simplified);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFullName('');
    setMobileNumber('');
    setLanguage('gu');
    setRegNumber('');
    setVehicleType('2-Wheeler');
    setFuelType('Petrol');
    setMakeModel('');
    setIssueDate(todayIsoDate());
    setExpiryDate(addDaysIsoDate(todayIsoDate(), 180));
    setCertNumber('');
    setHasInsurance(false);
    setPolicyNumber('');
    setInsuranceCompany('ICICI Lombard');
    setCustomCompany('');
    setPolicyType('Comprehensive');
    setInsStartDate(todayIsoDate());
    setInsExpiryDate(addDaysIsoDate(todayIsoDate(), 365));
    setPremiumAmount('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (c: CustomerItem) => {
    setEditingCustomer(c);
    setFullName(c.fullName);
    setMobileNumber(c.mobileNumber);
    setLanguage((c.language as 'gu' | 'hi' | 'en') || 'gu');
    setRegNumber(c.vehicle?.registrationNumber || '');
    setVehicleType(c.vehicle?.vehicleType || '2-Wheeler');
    setFuelType(c.vehicle?.fuelType || 'Petrol');
    setMakeModel(c.vehicle?.makeModel || '');
    setIssueDate(c.certificate?.issueDate ? c.certificate.issueDate.slice(0, 10) : todayIsoDate());
    setExpiryDate(c.certificate?.expiryDate ? c.certificate.expiryDate.slice(0, 10) : addDaysIsoDate(todayIsoDate(), 180));
    setCertNumber(c.certificate?.certificateNumber || '');

    if (c.insurance && c.insurance.policyNumber) {
      setHasInsurance(true);
      setPolicyNumber(c.insurance.policyNumber);
      const isKnown = COMMON_INSURERS.includes(c.insurance.insuranceCompany);
      if (isKnown) {
        setInsuranceCompany(c.insurance.insuranceCompany);
        setCustomCompany('');
      } else {
        setInsuranceCompany('Other');
        setCustomCompany(c.insurance.insuranceCompany);
      }
      setPolicyType(c.insurance.policyType || 'Comprehensive');
      setInsStartDate(c.insurance.startDate ? c.insurance.startDate.slice(0, 10) : todayIsoDate());
      setInsExpiryDate(c.insurance.expiryDate ? c.insurance.expiryDate.slice(0, 10) : addDaysIsoDate(todayIsoDate(), 365));
      setPremiumAmount(c.insurance.premiumAmount ? String(c.insurance.premiumAmount) : '');
    } else {
      setHasInsurance(false);
      setPolicyNumber('');
      setInsuranceCompany('ICICI Lombard');
      setCustomCompany('');
      setPolicyType('Comprehensive');
      setInsStartDate(todayIsoDate());
      setInsExpiryDate(addDaysIsoDate(todayIsoDate(), 365));
      setPremiumAmount('');
    }
    setFormError(null);
    setModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!regNumber.trim()) {
      setFormError('Vehicle registration number is required (e.g. GJ01AB1234)');
      return;
    }
    if (!issueDate || !expiryDate) {
      setFormError('Both PUC Issue Date and Expiry Date are required');
      return;
    }

    let resolvedCompany = insuranceCompany;
    if (hasInsurance) {
      if (!policyNumber.trim()) {
        setFormError('Policy Number is compulsory when insurance is enabled');
        return;
      }
      if (insuranceCompany === 'Other') {
        if (!customCompany.trim()) {
          setFormError('Please enter Insurance Company Name');
          return;
        }
        resolvedCompany = customCompany.trim();
      }
      if (!insStartDate || !insExpiryDate) {
        setFormError('Policy Start Date and Expiry Date are compulsory');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        fullName: fullName.trim(),
        mobileNumber: cleanPhone.slice(-10),
        language,
        registrationNumber: regNumber.trim().toUpperCase(),
        vehicleType,
        fuelType,
        makeModel: makeModel.trim() || undefined,
        issueDate,
        expiryDate,
        certificateNumber: certNumber.trim() || undefined,
        insurance: hasInsurance
          ? {
              hasInsurance: true,
              policyNumber: policyNumber.trim(),
              insuranceCompany: resolvedCompany,
              policyType,
              startDate: insStartDate,
              expiryDate: insExpiryDate,
              premiumAmount: premiumAmount ? Number(premiumAmount) : undefined,
            }
          : { hasInsurance: false },
      };

      if (editingCustomer) {
        await apiRequest(`/api/customers/${editingCustomer.id}`, {
          method: 'PUT',
          body: payload,
        });
        toast.success(`Updated customer: ${fullName}`);
      } else {
        const createRes = await apiRequest<{
          id: string;
          autoCallPlaced?: boolean;
          autoCallStatus?: string;
        }>('/api/customers', {
          method: 'POST',
          body: payload,
        });

        if (createRes.autoCallPlaced) {
          toast.success(`Registered: ${fullName}`, {
            description: `Automated welcome call dialed to +91 ${cleanPhone.slice(-10)} (${createRes.autoCallStatus || 'initiated'})`,
          });
        } else {
          toast.success(`Registered: ${fullName}`);
        }
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDirectCall = async (c: CustomerItem) => {
    setCallingId(c.id);
    try {
      const res = await apiRequest<{ ok: boolean; status?: string }>('/api/calls/manual', {
        method: 'POST',
        body: { customerId: c.id, certificateId: c.certificate?.id },
      });
      toast.success(`Outbound call placed to ${c.fullName} (${c.mobileNumber})`, {
        description: res.status ? `Exotel status: ${res.status}` : 'IVR dialing initiated via Exotel.',
      });
    } catch (err) {
      toast.error('Failed to dial customer', {
        description: err instanceof Error ? err.message : 'Please check Exotel configuration',
      });
    } finally {
      setCallingId(null);
    }
  };

  const openWhatsAppDialog = async (c: CustomerItem, chosenType: 'puc' | 'insurance' = 'puc') => {
    setWhatsappCustomer(c);
    const finalType = !c.insurance ? 'puc' : chosenType;
    setWhatsappType(finalType);
    setLoadingWhatsapp(true);
    try {
      const res = await apiRequest<{ success: boolean; whatsappUrl: string; messageText: string }>(
        `/api/customers/${c.id}/whatsapp`,
        {
          method: 'POST',
          body: { reminderType: finalType },
        },
      );
      setWhatsappPreview(res.messageText);
      setWhatsappUrl(res.whatsappUrl);
    } catch (err) {
      toast.error('Could not generate WhatsApp template', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
      setWhatsappCustomer(null);
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Customer ${deleteTarget.fullName} deleted`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (activeFilter === 'expiring') {
      list = list.filter((c) => c.certificate?.status === 'expiring_soon');
    } else if (activeFilter === 'expired') {
      list = list.filter((c) => c.certificate?.status === 'expired');
    } else if (activeFilter === 'insured') {
      list = list.filter((c) => Boolean(c.insurance && c.insurance.policyNumber));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.mobileNumber.includes(q) ||
          (c.vehicle?.registrationNumber && c.vehicle.registrationNumber.toLowerCase().includes(q)) ||
          (c.insurance?.policyNumber && c.insurance.policyNumber.toLowerCase().includes(q)) ||
          (c.insurance?.insuranceCompany && c.insurance.insuranceCompany.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [customers, activeFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = customers.length;
    const pucExpiring = customers.filter((c) => c.certificate?.status === 'expiring_soon').length;
    const insExpiring = customers.filter((c) => c.insurance?.status === 'expiring_soon').length;
    const expiredCount = customers.filter((c) => c.certificate?.status === 'expired').length;
    const insuredTotal = customers.filter((c) => Boolean(c.insurance && c.insurance.policyNumber)).length;
    return { total, pucExpiring, insExpiring, expiredCount, insuredTotal };
  }, [customers]);

  // Paginated customers
  const totalPages = Math.ceil(filteredCustomers.length / rowsPerPage) || 1;
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  const getInitials = (name?: string) => {
    if (!name) return 'C';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. OPERATIONS HEADER & MASTER STATUS BANNER */}
      <div className="rounded-2xl border border-indigo-100 dark:border-indigo-900/50 bg-gradient-to-r from-indigo-50/70 via-indigo-50/30 to-white dark:from-indigo-950/40 dark:via-slate-900 dark:to-slate-900 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              PUC & Insurance Operations
            </h1>
            <Badge variant="success" className="gap-1 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Automated customer lifecycle management, Exotel voice dialer, and personalized WhatsApp notifications.
          </p>
        </div>

        {/* Master Channels State indicator pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                settings?.callsEnabled !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-slate-600 dark:text-slate-400">Calls:</span>
            <Badge
              variant={settings?.callsEnabled !== false ? 'success' : 'secondary'}
              className="py-0 px-1.5 text-[10px]"
            >
              {settings?.callsEnabled !== false ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 text-xs font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${
                settings?.messagesEnabled !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`}
            />
            <span className="text-slate-600 dark:text-slate-400">WhatsApp:</span>
            <Badge
              variant={settings?.messagesEnabled !== false ? 'success' : 'secondary'}
              className="py-0 px-1.5 text-[10px]"
            >
              {settings?.messagesEnabled !== false ? 'ACTIVE' : 'OFF'}
            </Badge>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('settings-general')}
            className="gap-1.5 text-xs font-bold cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            Configure
          </Button>
        </div>
      </div>

      {/* 2. 4 EXECUTIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Customers */}
        <Card className="border-l-4 border-l-indigo-600 hover:shadow-md transition-all">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('totalCustomers')}
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Active registered owners
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Expiring Soon */}
        <Card className="border-l-4 border-l-amber-500 hover:shadow-md transition-all">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                {t('dueSoon')}
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {stats.pucExpiring}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Expiring in next 7 days
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Insured Vehicles */}
        <Card className="border-l-4 border-l-sky-500 hover:shadow-md transition-all">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                With Insurance
              </span>
              <div className="h-8 w-8 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-sky-400">
              {stats.insuredTotal}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              {stats.insExpiring} due in 15 days
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Expired / Overdue */}
        <Card className="border-l-4 border-l-red-500 hover:shadow-md transition-all">
          <CardHeader className="p-4 sm:p-5 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                {t('filterExpired')}
              </span>
              <div className="h-8 w-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-5 pt-0">
            <div className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
              {stats.expiredCount}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
              Immediate voice call required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. SEARCH BAR, FILTER PILLS & REGISTER ACTION */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t('searchPlaceholder')}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setActiveFilter('all');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('filterAll')} ({customers.length})
          </button>

          <button
            onClick={() => {
              setActiveFilter('expiring');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              activeFilter === 'expiring'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('filterExpiringSoon')} ({stats.pucExpiring})
          </button>

          <button
            onClick={() => {
              setActiveFilter('expired');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              activeFilter === 'expired'
                ? 'bg-red-600 text-white border-red-600 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            {t('filterExpired')} ({stats.expiredCount})
          </button>

          <button
            onClick={() => {
              setActiveFilter('insured');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
              activeFilter === 'insured'
                ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            Insured ({stats.insuredTotal})
          </button>

          <Button
            onClick={openCreateModal}
            className="font-bold gap-1.5 shrink-0 ml-auto cursor-pointer shadow-sm shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            {t('registerCustomer')}
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            title={t('refresh')}
            className="shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 4A. DESKTOP DATA TABLE (Visible on >= md screens) */}
      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colCustomer')}</TableHead>
              <TableHead>{t('colVehicle')}</TableHead>
              <TableHead>{t('colPucExpiry')}</TableHead>
              <TableHead>{t('colInsurance')}</TableHead>
              <TableHead className="text-right">{t('colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="w-20 h-3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="w-24 h-8 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Car className="w-8 h-8 text-slate-400" />
                    <p className="font-semibold text-sm">{t('noCustomersFound')}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateModal}
                      className="mt-2 font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      {t('registerCustomer')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedCustomers.map((c) => {
                const isPucExpired = c.certificate?.status === 'expired';
                const isPucExpSoon = c.certificate?.status === 'expiring_soon';
                const hasIns = Boolean(c.insurance && c.insurance.policyNumber);
                const isInsExpired = c.insurance?.status === 'expired';
                const isInsExpSoon = c.insurance?.status === 'expiring_soon';

                return (
                  <TableRow key={c.id}>
                    {/* Customer Info */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ring-1 ring-indigo-500/20">
                          <AvatarFallback className="text-xs font-bold">
                            {getInitials(c.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">
                            {c.fullName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                              +91 {c.mobileNumber}
                            </span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1 font-semibold">
                              {c.language ? c.language.toUpperCase() : 'GU'}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </TableCell>

                    {/* Vehicle Plate */}
                    <TableCell>
                      <div className="space-y-1">
                        <IndianNumberPlate
                          regNumber={c.vehicle?.registrationNumber || 'GJ01AB1234'}
                        />
                        <p className="text-[11px] text-slate-400">
                          {c.vehicle?.vehicleType || '2-Wheeler'} • {c.vehicle?.fuelType || 'Petrol'}
                        </p>
                      </div>
                    </TableCell>

                    {/* PUC Expiry */}
                    <TableCell>
                      <div className="space-y-1">
                        <span className="font-medium text-xs text-slate-800 dark:text-slate-200 block">
                          {formatDateShort(c.certificate?.expiryDate)}
                        </span>
                        {isPucExpired ? (
                          <Badge variant="destructive" className="text-[10px] py-0 px-1.5 font-bold">
                            Expired ({Math.abs(c.certificate?.daysUntilExpiry || 0)}d ago)
                          </Badge>
                        ) : isPucExpSoon ? (
                          <Badge variant="warning" className="text-[10px] py-0 px-1.5 font-bold">
                            Due in {c.certificate?.daysUntilExpiry}d
                          </Badge>
                        ) : (
                          <Badge variant="success" className="text-[10px] py-0 px-1.5 font-bold">
                            Active
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Insurance Details */}
                    <TableCell>
                      {hasIns && c.insurance ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                            {c.insurance.insuranceCompany}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 block truncate max-w-[140px]">
                            {c.insurance.policyNumber}
                          </span>
                          {isInsExpired ? (
                            <Badge variant="destructive" className="text-[9px] py-0 px-1 font-bold">
                              Expired
                            </Badge>
                          ) : isInsExpSoon ? (
                            <Badge variant="warning" className="text-[9px] py-0 px-1 font-bold">
                              Due in {c.insurance.daysUntilExpiry}d
                            </Badge>
                          ) : (
                            <Badge variant="info" className="text-[9px] py-0 px-1 font-bold">
                              Covered
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No Policy Added</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Direct Outbound Voice Call Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDirectCall(c)}
                          disabled={callingId === c.id}
                          className="h-8 gap-1.5 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-bold text-xs"
                          title="Trigger automated IVR call now"
                        >
                          <PhoneCall className={`w-3.5 h-3.5 ${callingId === c.id ? 'animate-spin' : ''}`} />
                          {callingId === c.id ? 'Calling...' : t('callNow')}
                        </Button>

                        {/* WhatsApp Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWhatsAppDialog(c, hasIns && isInsExpSoon ? 'insurance' : 'puc')}
                          className="h-8 gap-1.5 border-emerald-500/40 text-emerald-600 hover:bg-emerald-500 hover:text-white font-bold text-xs"
                          title="Generate and send WhatsApp reminder"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          WhatsApp
                        </Button>

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(c)}
                          className="text-slate-500 hover:text-slate-900 dark:hover:text-white"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(c)}
                          className="text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Desktop Pagination Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {filteredCustomers.length === 0 ? 0 : page * rowsPerPage + 1} to{' '}
            {Math.min((page + 1) * rowsPerPage, filteredCustomers.length)} of {filteredCustomers.length} vehicles
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="font-bold">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* 4B. MOBILE RESPONSIVE CARDS (Visible on < md screens) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="p-4 space-y-3">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/3" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse w-1/2" />
              <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </Card>
          ))
        ) : paginatedCustomers.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Car className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-sm">{t('noCustomersFound')}</p>
          </Card>
        ) : (
          paginatedCustomers.map((c) => {
            const isPucExpired = c.certificate?.status === 'expired';
            const isPucExpSoon = c.certificate?.status === 'expiring_soon';
            const hasIns = Boolean(c.insurance && c.insurance.policyNumber);
            const isInsExpSoon = c.insurance?.status === 'expiring_soon';

            return (
              <Card key={c.id} className="p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-9 w-9 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                      <AvatarFallback className="text-xs font-bold">
                        {getInitials(c.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                        {c.fullName}
                      </h4>
                      <p className="text-xs font-mono text-slate-500 mt-0.5">
                        +91 {c.mobileNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditModal(c)}
                      className="text-slate-500"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(c)}
                      className="text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Plate and Expiry Status */}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <IndianNumberPlate
                    regNumber={c.vehicle?.registrationNumber || 'GJ01AB1234'}
                  />
                  <div>
                    {isPucExpired ? (
                      <Badge variant="destructive" className="text-[10px] font-bold">
                        Expired ({Math.abs(c.certificate?.daysUntilExpiry || 0)}d ago)
                      </Badge>
                    ) : isPucExpSoon ? (
                      <Badge variant="warning" className="text-[10px] font-bold">
                        Due in {c.certificate?.daysUntilExpiry}d
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px] font-bold">
                        Active PUC
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Mobile Full Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDirectCall(c)}
                    disabled={callingId === c.id}
                    className="w-full font-bold text-xs border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 gap-1.5"
                  >
                    <PhoneCall className={`w-3.5 h-3.5 ${callingId === c.id ? 'animate-spin' : ''}`} />
                    {callingId === c.id ? 'Calling...' : t('callNow')}
                  </Button>

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => openWhatsAppDialog(c, hasIns && isInsExpSoon ? 'insurance' : 'puc')}
                    className="w-full font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    WhatsApp
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. CREATE / EDIT CUSTOMER DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold">
              {editingCustomer ? `Edit Customer: ${editingCustomer.fullName}` : t('addCustomerTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {t('addCustomerDesc')}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="space-y-4 pt-1">
            {formError && (
              <Alert variant="destructive" className="py-2.5">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            {/* SECTION 1: Customer Info */}
            <div className="space-y-3">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                1. Customer Profile
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cust-name">{t('customerFullName')} *</Label>
                  <Input
                    id="cust-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cust-mobile">{t('customerMobile')} *</Label>
                  <Input
                    id="cust-mobile"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="9876543210"
                    className="font-mono"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cust-lang">{t('preferredLanguage')}</Label>
                <SelectInput
                  id="cust-lang"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as 'gu' | 'hi' | 'en')}
                >
                  <option value="gu">Gujarati (ગુજરાતી) — Default</option>
                  <option value="hi">Hindi (हिंदी)</option>
                  <option value="en">English</option>
                </SelectInput>
              </div>
            </div>

            {/* SECTION 2: Vehicle & PUC Certificate */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                2. Vehicle & PUC Details
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="veh-plate">{t('vehiclePlate')} *</Label>
                  <Input
                    id="veh-plate"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    placeholder={t('vehiclePlatePlaceholder')}
                    className="font-mono uppercase font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="veh-type">Vehicle Category</Label>
                  <SelectInput
                    id="veh-type"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                  >
                    <option value="2-Wheeler">2-Wheeler (Motorcycle/Scooter)</option>
                    <option value="4-Wheeler">4-Wheeler (Car/Jeep/SUV)</option>
                    <option value="Commercial">Commercial / Transport</option>
                    <option value="Other">Other Vehicle</option>
                  </SelectInput>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="veh-fuel">Fuel Type</Label>
                  <SelectInput
                    id="veh-fuel"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value)}
                  >
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric / EV</option>
                  </SelectInput>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="veh-model">Vehicle Make / Model (Optional)</Label>
                  <Input
                    id="veh-model"
                    value={makeModel}
                    onChange={(e) => setMakeModel(e.target.value)}
                    placeholder="e.g. Honda Activa 6G"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="puc-issue">Certificate Issue Date *</Label>
                  <Input
                    id="puc-issue"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="puc-expiry">{t('pucExpiryDate')} *</Label>
                  <Input
                    id="puc-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: Insurance Details (Optional) */}
            <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    3. Insurance Policy (Optional)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Track insurance renewals alongside PUC certificates
                  </span>
                </div>
                <Switch
                  checked={hasInsurance}
                  onCheckedChange={setHasInsurance}
                />
              </div>

              {hasInsurance && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ins-number">Policy Number *</Label>
                      <Input
                        id="ins-number"
                        value={policyNumber}
                        onChange={(e) => setPolicyNumber(e.target.value)}
                        placeholder="e.g. 3001/2026/89472"
                        className="font-mono text-xs"
                        required={hasInsurance}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ins-company">Insurance Company *</Label>
                      <SelectInput
                        id="ins-company"
                        value={insuranceCompany}
                        onChange={(e) => setInsuranceCompany(e.target.value)}
                      >
                        {COMMON_INSURERS.map((comp) => (
                          <option key={comp} value={comp}>
                            {comp}
                          </option>
                        ))}
                      </SelectInput>
                    </div>
                  </div>

                  {insuranceCompany === 'Other' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="ins-custom">Enter Company Name *</Label>
                      <Input
                        id="ins-custom"
                        value={customCompany}
                        onChange={(e) => setCustomCompany(e.target.value)}
                        placeholder="Company Name"
                        required={hasInsurance}
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="ins-start">Policy Start Date *</Label>
                      <Input
                        id="ins-start"
                        type="date"
                        value={insStartDate}
                        onChange={(e) => setInsStartDate(e.target.value)}
                        required={hasInsurance}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="ins-expiry">Policy Expiry Date *</Label>
                      <Input
                        id="ins-expiry"
                        type="date"
                        value={insExpiryDate}
                        onChange={(e) => setInsExpiryDate(e.target.value)}
                        required={hasInsurance}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Auto-Call Notice */}
            {!editingCustomer && (
              <Alert variant="info" className="py-2.5">
                <AlertDescription className="text-[11px] leading-relaxed">
                  {t('autoCallNotice')}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                disabled={submitting}
              >
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="font-bold shadow-xs cursor-pointer"
              >
                {submitting ? t('savingCustomer') : editingCustomer ? 'Save Changes' : t('saveCustomer')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 6. REALISTIC WHATSAPP SIMULATOR DIALOG */}
      <Dialog
        open={Boolean(whatsappCustomer)}
        onOpenChange={(open) => !open && setWhatsappCustomer(null)}
      >
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl">
          <div className="bg-[#075E54] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9 bg-white/20 text-white font-bold ring-1 ring-white/30">
                <AvatarFallback>{getInitials(whatsappCustomer?.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-sm leading-tight flex items-center gap-1.5">
                  {whatsappCustomer?.fullName}
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </h4>
                <p className="text-[11px] text-white/80 font-mono">
                  +91 {whatsappCustomer?.mobileNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#e5ddd5]/40 dark:bg-slate-950 min-h-[220px] flex flex-col justify-end">
            {loadingWhatsapp ? (
              <div className="flex items-center justify-center p-8 text-slate-500">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                <span className="text-xs">Generating reminder message...</span>
              </div>
            ) : (
              <div className="max-w-[90%] rounded-2xl rounded-bl-xs bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 p-3 shadow-xs ml-auto">
                <p className="text-xs text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {whatsappPreview}
                </p>
                <span className="text-[9px] text-slate-400 float-right mt-1 font-mono">
                  10:30 AM • Delivered
                </span>
              </div>
            )}
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWhatsappCustomer(null)}
            >
              Close
            </Button>

            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold text-xs shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open WhatsApp
              </a>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 7. DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent className="max-w-sm p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Delete Vehicle Record
            </DialogTitle>
            <DialogDescription className="text-xs mt-2">
              Are you sure you want to delete customer{' '}
              <strong className="text-slate-900 dark:text-white">{deleteTarget?.fullName}</strong> and their
              vehicle record? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="font-bold cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
