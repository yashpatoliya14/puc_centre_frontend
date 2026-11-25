import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Car,
  MessageSquare,
  Search,
  X,
  Plus,
  RefreshCw,
  Clock,
  ShieldCheck,
  AlertCircle,
  Users,
  User,
  Phone,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Shield,
  CheckCircle2,
  QrCode,
  FileText,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { formatDateShort, todayIsoDate, addDaysIsoDate } from '../lib/utils';
import { useI18n } from '../context/I18nContext';
import type { NavRoute } from '../components/layout/AppShell';
import { PucScannerPanel, type ExtractedPucData } from '../components/scanner/PucScannerPanel';

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
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
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
    <div className="inline-flex items-stretch rounded-md border border-slate-800 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden select-none">
      <div className="bg-[#003399] text-white px-1.5 py-0.5 flex flex-col items-center justify-center border-r border-white/20">
        <span className="text-[8px] font-black tracking-wider leading-none">IND</span>
      </div>
      <div className="px-2 py-0.5 flex items-center bg-white dark:bg-slate-900">
        <span className="font-mono font-bold text-xs tracking-wider text-slate-900 dark:text-slate-100 uppercase leading-none">
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

  // Delete states
  const [deleteTarget, setDeleteTarget] = useState<CustomerItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // WhatsApp dialog state
  const [whatsappCustomer, setWhatsappCustomer] = useState<CustomerItem | null>(null);
  const [whatsappType, setWhatsappType] = useState<'puc' | 'insurance'>('puc');
  const [whatsappPreview, setWhatsappPreview] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [loadingWhatsapp, setLoadingWhatsapp] = useState(false);
  const [sendingApiWhatsapp, setSendingApiWhatsapp] = useState(false);

  // Customer modal state (Create / Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const formBodyRef = useRef<HTMLDivElement | null>(null);

  const showFormError = (msg: string) => {
    setFormError(msg);
    formBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleScanAutoFill = (extracted: ExtractedPucData) => {
    if (extracted.regNumber) setRegNumber(extracted.regNumber);
    if (extracted.fullName) setFullName(extracted.fullName);
    if (extracted.mobileNumber) setMobileNumber(extracted.mobileNumber);
    if (extracted.fuelType) setFuelType(extracted.fuelType);
    if (extracted.vehicleType) setVehicleType(extracted.vehicleType);
    if (extracted.makeModel) setMakeModel(extracted.makeModel);
    if (extracted.issueDate) setIssueDate(extracted.issueDate);
    if (extracted.expiryDate) setExpiryDate(extracted.expiryDate);
    if (extracted.certificateNumber) setCertNumber(extracted.certificateNumber);
    if (extracted.insuranceCompany) {
      setHasInsurance(true);
      setInsuranceCompany(extracted.insuranceCompany);
      if (extracted.insuranceExpiry) {
        setInsExpiryDate(extracted.insuranceExpiry);
      }
    }
  };

  const [inlineLookupLoading, setInlineLookupLoading] = useState(false);

  const handleInlinePlateLookup = async (plate: string) => {
    const clean = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!clean || clean.length < 5) {
      toast.error('Please enter a valid vehicle plate (e.g. GJ01AB1234)');
      return;
    }
    setInlineLookupLoading(true);
    try {
      const res = await apiRequest<{ ok: boolean; data: ExtractedPucData & { source?: string } }>(
        `/api/scanner/lookup-vehicle?regNumber=${encodeURIComponent(clean)}`,
      );
      if (res.ok && res.data) {
        handleScanAutoFill(res.data);
        toast.success(`Fetched details for ${res.data.regNumber}`, {
          description: `${res.data.fullName || 'Customer'} • ${res.data.makeModel || ''}`,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lookup failed';
      toast.error(msg);
    } finally {
      setInlineLookupLoading(false);
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (!fullName.trim()) {
      showFormError('Customer full name is required');
      return;
    }
    if (cleanPhone.length < 10) {
      showFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!regNumber.trim()) {
      showFormError('Vehicle registration number is required (e.g. GJ01AB1234)');
      return;
    }
    if (!issueDate || !expiryDate) {
      showFormError('Both PUC Issue Date and Expiry Date are required');
      return;
    }

    let resolvedCompany = insuranceCompany;
    if (hasInsurance) {
      if (!policyNumber.trim()) {
        showFormError('Policy Number is compulsory when insurance is enabled');
        return;
      }
      if (insuranceCompany === 'Other') {
        if (!customCompany.trim()) {
          showFormError('Please enter Insurance Company Name');
          return;
        }
        resolvedCompany = customCompany.trim();
      }
      if (!insStartDate || !insExpiryDate) {
        showFormError('Policy Start Date and Expiry Date are compulsory');
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
        await apiRequest<{ id: string }>('/api/customers', {
          method: 'POST',
          body: payload,
        });
        toast.success(`Registered: ${fullName}`, {
          description: `Vehicle saved and scheduled for WhatsApp reminders.`,
        });
      }

      setModalOpen(false);
      await loadData();
    } catch (err) {
      showFormError(err instanceof Error ? err.message : 'Failed to save customer');
    } finally {
      setSubmitting(false);
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

  const handleSendApiWhatsApp = async () => {
    if (!whatsappCustomer) return;
    setSendingApiWhatsapp(true);
    try {
      const res = await apiRequest<{ ok: boolean; messageId: string; template: string }>(
        `/api/customers/${whatsappCustomer.id}/send-whatsapp`,
        {
          method: 'POST',
          body: { reminderType: whatsappType },
        },
      );
      if (res.ok) {
        toast.success(`Message dispatched via WhatsApp Cloud API!`, {
          description: `Template: ${res.template} • ID: ${res.messageId ? res.messageId.slice(0, 16) + '...' : 'Delivered'}`,
        });
        setWhatsappCustomer(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to send WhatsApp message';
      toast.error(msg, {
        description: 'You can also click "Open in WhatsApp" to deliver directly from your device.',
      });
    } finally {
      setSendingApiWhatsapp(false);
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
    <div className="space-y-6 pb-12">
      {/* 1. CLEAN EXECUTIVE PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Vehicles & Reminders
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {stats.total} total
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track vehicle PUC certificates, manage expiry warnings, and dispatch WhatsApp renewal reminders.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            title={t('refresh')}
            className="h-9 gap-1.5 text-xs font-medium cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setBulkModalOpen(true)}
            className="h-9 gap-1.5 font-semibold text-xs border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Bulk Upload (PDF / Image)</span>
          </Button>

          <Button
            onClick={openCreateModal}
            size="sm"
            className="h-9 gap-1.5 font-semibold text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {t('registerCustomer')}
          </Button>
        </div>
      </div>

      {/* 2. REFINED MINIMALIST KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Registered */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('totalCustomers')}
              </span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-2">
              {stats.total}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Active customer profiles
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Due in 7 Days */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                {t('dueSoon')}
              </span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400 mt-2">
              {stats.pucExpiring}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Expiring in next 7 days
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Expired / Overdue */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                {t('filterExpired')}
              </span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-red-600 dark:text-red-400 mt-2">
              {stats.expiredCount}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              WhatsApp alert needed
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Insured Coverage */}
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Insured Vehicles
              </span>
              <ShieldCheck className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 mt-2">
              {stats.insuredTotal}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {stats.insExpiring} policies due soon
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 3. SEARCH & SEGMENTED FILTER TABS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            placeholder={t('searchPlaceholder')}
            className="pl-9 pr-8 h-9 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Segmented Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => {
              setActiveFilter('all');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('filterAll')} ({customers.length})
          </button>

          <button
            onClick={() => {
              setActiveFilter('expiring');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'expiring'
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('filterExpiringSoon')} ({stats.pucExpiring})
          </button>

          <button
            onClick={() => {
              setActiveFilter('expired');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'expired'
                ? 'bg-red-500 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {t('filterExpired')} ({stats.expiredCount})
          </button>

          <button
            onClick={() => {
              setActiveFilter('insured');
              setPage(0);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer shrink-0 ${
              activeFilter === 'insured'
                ? 'bg-sky-600 text-white shadow-2xs'
                : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            Insured ({stats.insuredTotal})
          </button>
        </div>
      </div>

      {/* 4A. DESKTOP DATA TABLE (Visible on >= md screens) */}
      <div className="hidden md:block rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
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
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                      <div className="space-y-1.5">
                        <div className="w-24 h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                        <div className="w-16 h-2.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-3.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="w-20 h-3.5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="w-24 h-7 bg-slate-100 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                  </TableCell>
                </TableRow>
              ))
            ) : paginatedCustomers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Car className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium text-xs text-slate-600 dark:text-slate-400">
                      {t('noCustomersFound')}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openCreateModal}
                      className="mt-2 text-xs"
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
                        <Avatar className="h-8 w-8 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs font-bold ring-1 ring-slate-200 dark:ring-slate-700">
                          <AvatarFallback>
                            {getInitials(c.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs leading-none">
                            {c.fullName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="font-mono text-[11px] text-slate-500">
                              +91 {c.mobileNumber}
                            </span>
                            <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                              {c.language || 'GU'}
                            </span>
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
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {c.vehicle?.vehicleType || '2-Wheeler'} • {c.vehicle?.fuelType || 'Petrol'}
                        </p>
                      </div>
                    </TableCell>

                    {/* PUC Expiry */}
                    <TableCell>
                      <div className="space-y-1">
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                          {formatDateShort(c.certificate?.expiryDate)}
                        </span>
                        {isPucExpired ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-red-600 dark:text-red-400">
                            Expired ({Math.abs(c.certificate?.daysUntilExpiry || 0)}d ago)
                          </span>
                        ) : isPucExpSoon ? (
                          <span className="inline-flex items-center text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            Due in {c.certificate?.daysUntilExpiry}d
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            Active
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Insurance Details */}
                    <TableCell>
                      {hasIns && c.insurance ? (
                        <div className="space-y-0.5">
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">
                            {c.insurance.insuranceCompany}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 block truncate max-w-[130px]">
                            {c.insurance.policyNumber}
                          </span>
                          {isInsExpired ? (
                            <span className="text-[10px] font-semibold text-red-600">Expired</span>
                          ) : isInsExpSoon ? (
                            <span className="text-[10px] font-semibold text-amber-600">
                              Due in {c.insurance.daysUntilExpiry}d
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-600">Covered</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* WhatsApp Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openWhatsAppDialog(c, hasIns && isInsExpSoon ? 'insurance' : 'puc')}
                          className="h-8 gap-1.5 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-semibold cursor-pointer"
                          title="Open WhatsApp reminder preview"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </Button>

                        {/* Edit Button */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEditModal(c)}
                          className="text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 h-8 w-8"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeleteTarget(c)}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 h-8 w-8"
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
              className="h-7 w-7"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span className="font-medium text-xs">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="h-7 w-7"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* 4B. MOBILE RESPONSIVE CARDS (Visible on < md screens) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <Card key={idx} className="p-4 space-y-3">
              <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/3" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse w-1/2" />
              <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
            </Card>
          ))
        ) : paginatedCustomers.length === 0 ? (
          <Card className="p-8 text-center text-slate-500">
            <Car className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="font-medium text-xs">{t('noCustomersFound')}</p>
          </Card>
        ) : (
          paginatedCustomers.map((c) => {
            const isPucExpired = c.certificate?.status === 'expired';
            const isPucExpSoon = c.certificate?.status === 'expiring_soon';
            const hasIns = Boolean(c.insurance && c.insurance.policyNumber);
            const isInsExpSoon = c.insurance?.status === 'expiring_soon';

            return (
              <Card key={c.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <Avatar className="h-8 w-8 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-bold text-xs">
                      <AvatarFallback>{getInitials(c.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {c.fullName}
                      </h4>
                      <p className="text-[11px] font-mono text-slate-500">
                        +91 {c.mobileNumber}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditModal(c)}
                      className="text-slate-400 h-7 w-7"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDeleteTarget(c)}
                      className="text-slate-400 hover:text-red-500 h-7 w-7"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Plate and Expiry Status */}
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <IndianNumberPlate
                    regNumber={c.vehicle?.registrationNumber || 'GJ01AB1234'}
                  />
                  <div>
                    {isPucExpired ? (
                      <span className="text-[10px] font-semibold text-red-600">
                        Expired ({Math.abs(c.certificate?.daysUntilExpiry || 0)}d ago)
                      </span>
                    ) : isPucExpSoon ? (
                      <span className="text-[10px] font-semibold text-amber-600">
                        Due in {c.certificate?.daysUntilExpiry}d
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-emerald-600">
                        Active
                      </span>
                    )}
                  </div>
                </div>

                {/* Mobile Full Action Button */}
                <div className="pt-0.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openWhatsAppDialog(c, hasIns && isInsExpSoon ? 'insurance' : 'puc')}
                    className="w-full font-semibold text-xs border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                    Send WhatsApp Reminder
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* 5. CREATE / EDIT CUSTOMER DIALOG */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          {/* Fixed Header */}
          <DialogHeader className="px-5 sm:px-6 py-4 pr-12 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-slate-900 dark:from-indigo-500 dark:to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Car className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <DialogTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingCustomer ? `Edit Customer: ${editingCustomer.fullName}` : t('addCustomerTitle')}
                  </DialogTitle>
                  {!editingCustomer && (
                    <Badge
                      variant="outline"
                      className="text-[10px] py-0 px-2 font-semibold bg-indigo-50/80 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800"
                    >
                      Quick Entry
                    </Badge>
                  )}
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingCustomer
                    ? 'Update customer profile, PUC validity, and insurance renewal dates'
                    : 'Auto-fill via plate or Parivahan PDF/image, or enter details manually'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSaveCustomer} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Body */}
            <div ref={formBodyRef} className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-5">
              {formError && (
                <Alert variant="destructive" className="py-2.5 rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs font-medium">{formError}</AlertDescription>
                </Alert>
              )}

              {/* 1-Click Fast Auto-Fill (Scan QR, Upload Parivahan PDF, Photo & WhatsApp) */}
              {!editingCustomer && (
                <PucScannerPanel
                  onExtracted={handleScanAutoFill}
                  onBulkComplete={() => {
                    setModalOpen(false);
                    loadData();
                  }}
                />
              )}

              {/* SECTION 1: Customer Profile */}
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <User className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Customer Details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-name" className="text-xs font-semibold">
                      {t('customerFullName')} <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cust-name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Patel"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cust-mobile" className="text-xs font-semibold">
                      {t('customerMobile')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent shadow-xs overflow-hidden">
                      <span className="px-2.5 h-10 flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 border-r border-slate-200 dark:border-slate-700 text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 select-none shrink-0">
                        <Phone className="h-3 w-3 text-slate-400" />
                        +91
                      </span>
                      <Input
                        id="cust-mobile"
                        type="tel"
                        inputMode="tel"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                        placeholder="9876543210"
                        className="border-0 shadow-none focus-visible:ring-0 font-mono bg-transparent"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">{t('preferredLanguage')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { code: 'gu' as const, label: 'Gujarati', native: 'ગુજરાતી' },
                      { code: 'hi' as const, label: 'Hindi', native: 'हिंदी' },
                      { code: 'en' as const, label: 'English', native: 'ENG' },
                    ].map((lang) => {
                      const active = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => setLanguage(lang.code)}
                          className={`flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                            active
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:border-indigo-500 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-2xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <span>{lang.label}</span>
                          <span className="text-[10px] opacity-75">({lang.native})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 2: Vehicle & PUC Certificate */}
              <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    Vehicle & PUC Certificate
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="veh-plate" className="text-xs font-semibold">
                      {t('vehiclePlate')} <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent shadow-xs overflow-hidden">
                        <span className="px-2 h-10 bg-[#003399] text-white text-[9px] font-black tracking-wider flex items-center justify-center select-none shrink-0">
                          IND
                        </span>
                        <Input
                          id="veh-plate"
                          value={regNumber}
                          onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                          placeholder={t('vehiclePlatePlaceholder')}
                          className="border-0 shadow-none focus-visible:ring-0 font-mono uppercase font-bold text-sm tracking-wide bg-transparent"
                          required
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleInlinePlateLookup(regNumber)}
                        disabled={inlineLookupLoading || !regNumber || regNumber.replace(/[^A-Za-z0-9]/g, '').length < 5}
                        title="Auto-fetch vehicle specs from plate"
                        className="h-10 px-3 text-xs font-semibold shrink-0 gap-1.5 border-indigo-200 dark:border-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/50 cursor-pointer"
                      >
                        {inlineLookupLoading ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Zap className="h-3.5 w-3.5" />
                        )}
                        Fetch
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="veh-type" className="text-xs font-semibold">
                      Vehicle Category
                    </Label>
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

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="veh-fuel" className="text-xs font-semibold">
                      Fuel Type
                    </Label>
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
                    <Label htmlFor="veh-model" className="text-xs font-semibold">
                      Make / Model <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="veh-model"
                      value={makeModel}
                      onChange={(e) => setMakeModel(e.target.value)}
                      placeholder="e.g. Honda Activa 6G"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="puc-cert-no" className="text-xs font-semibold">
                      PUC Cert No. <span className="text-slate-400 font-normal">(Optional)</span>
                    </Label>
                    <Input
                      id="puc-cert-no"
                      value={certNumber}
                      onChange={(e) => setCertNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. GJ01PU001234"
                      className="font-mono text-xs uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label htmlFor="puc-issue" className="text-xs font-semibold">
                      Certificate Issue Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="puc-issue"
                      type="date"
                      value={issueDate}
                      onChange={(e) => setIssueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="puc-expiry" className="text-xs font-semibold">
                        {t('pucExpiryDate')} <span className="text-red-500">*</span>
                      </Label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setExpiryDate(addDaysIsoDate(issueDate || todayIsoDate(), 180))}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200/80 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950 dark:text-slate-300 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          +6 Mo
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpiryDate(addDaysIsoDate(issueDate || todayIsoDate(), 365))}
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200/80 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950 dark:text-slate-300 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                        >
                          +1 Yr
                        </button>
                      </div>
                    </div>
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
              <div
                className={`rounded-xl border p-4 space-y-3.5 transition-colors ${
                  hasInsurance
                    ? 'border-indigo-200 dark:border-indigo-900/70 bg-indigo-50/30 dark:bg-indigo-950/20'
                    : 'border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[10px] font-bold flex items-center justify-center shrink-0">
                      3
                    </span>
                    <Shield className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                          Insurance Policy
                        </span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium text-slate-500">
                          Optional
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Track insurance renewals alongside PUC certificates
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={hasInsurance}
                    onCheckedChange={setHasInsurance}
                  />
                </div>

                {hasInsurance && (
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800 space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="ins-number" className="text-xs font-semibold">
                          Policy Number <span className="text-red-500">*</span>
                        </Label>
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
                        <Label htmlFor="ins-company" className="text-xs font-semibold">
                          Insurance Company <span className="text-red-500">*</span>
                        </Label>
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
                        <Label htmlFor="ins-custom" className="text-xs font-semibold">
                          Enter Company Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ins-custom"
                          value={customCompany}
                          onChange={(e) => setCustomCompany(e.target.value)}
                          placeholder="Company Name"
                          required={hasInsurance}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="ins-policy-type" className="text-xs font-semibold">
                          Policy Type
                        </Label>
                        <SelectInput
                          id="ins-policy-type"
                          value={policyType}
                          onChange={(e) => setPolicyType(e.target.value)}
                        >
                          <option value="Comprehensive">Comprehensive</option>
                          <option value="Third Party">Third Party</option>
                          <option value="Own Damage">Own Damage</option>
                        </SelectInput>
                      </div>

                      <div className="space-y-1.5">
                        <Label htmlFor="ins-premium" className="text-xs font-semibold">
                          Premium Amount (₹) <span className="text-slate-400 font-normal">(Optional)</span>
                        </Label>
                        <Input
                          id="ins-premium"
                          type="number"
                          min="0"
                          value={premiumAmount}
                          onChange={(e) => setPremiumAmount(e.target.value)}
                          placeholder="e.g. 2450"
                          className="font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div className="space-y-1.5">
                        <Label htmlFor="ins-start" className="text-xs font-semibold">
                          Policy Start Date <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="ins-start"
                          type="date"
                          value={insStartDate}
                          onChange={(e) => setInsStartDate(e.target.value)}
                          required={hasInsurance}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <Label htmlFor="ins-expiry" className="text-xs font-semibold">
                            Policy Expiry Date <span className="text-red-500">*</span>
                          </Label>
                          <button
                            type="button"
                            onClick={() => setInsExpiryDate(addDaysIsoDate(insStartDate || todayIsoDate(), 365))}
                            className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-200/80 hover:bg-indigo-100 text-slate-700 hover:text-indigo-700 dark:bg-slate-800 dark:hover:bg-indigo-950 dark:text-slate-300 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                          >
                            +1 Yr
                          </button>
                        </div>
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
            </div>

            {/* Sticky Footer */}
            <DialogFooter className="px-5 sm:px-6 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-row items-center justify-between gap-3 shrink-0 sm:space-x-0">
              <div className="hidden sm:flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                <span>WhatsApp renewal reminders auto-scheduled</span>
              </div>
              <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                  className="h-9 px-4 text-xs font-medium cursor-pointer"
                >
                  {t('cancel')}
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="h-9 px-5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 gap-1.5 shadow-xs cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>{t('savingCustomer')}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{editingCustomer ? 'Save Changes' : t('saveCustomer')}</span>
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 5B. DEDICATED BULK REGISTRATION DIALOG (PDF & IMAGE) */}
      <Dialog open={bulkModalOpen} onOpenChange={setBulkModalOpen}>
        <DialogContent className="max-w-2xl sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl">
          <DialogHeader className="px-5 sm:px-6 py-4 pr-12 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/90 shrink-0 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-bold">
                  Bulk Register Customers (PDF & Images)
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Drop multiple Parivahan PDF certificates or images at once to auto-extract and register all customers in 1 click.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5">
            <PucScannerPanel
              initialTab="upload"
              hideTabs={true}
              onBulkComplete={() => {
                setBulkModalOpen(false);
                loadData();
              }}
              onExtracted={(extracted) => {
                setBulkModalOpen(false);
                openCreateModal();
                handleScanAutoFill(extracted);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* 6. WHATSAPP PREVIEW DIALOG */}
      <Dialog
        open={Boolean(whatsappCustomer)}
        onOpenChange={(open) => !open && setWhatsappCustomer(null)}
      >
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden rounded-2xl">
          <div className="bg-[#075E54] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 bg-white/20 text-white font-bold ring-1 ring-white/30 text-xs">
                <AvatarFallback>{getInitials(whatsappCustomer?.fullName)}</AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-bold text-xs leading-tight flex items-center gap-1.5">
                  {whatsappCustomer?.fullName}
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                </h4>
                <p className="text-[10px] text-white/80 font-mono">
                  +91 {whatsappCustomer?.mobileNumber}
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#e5ddd5]/30 dark:bg-slate-950 min-h-[200px] flex flex-col justify-end">
            {loadingWhatsapp ? (
              <div className="flex items-center justify-center p-8 text-slate-500">
                <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                <span className="text-xs">Generating reminder message...</span>
              </div>
            ) : (
              <div className="max-w-[90%] rounded-2xl rounded-bl-xs bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-800 p-3 shadow-2xs ml-auto">
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
              className="text-xs"
            >
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleSendApiWhatsApp}
                disabled={sendingApiWhatsapp || loadingWhatsapp}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-2xs cursor-pointer disabled:opacity-50"
              >
                {sendingApiWhatsapp ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                <span>Send via Meta API</span>
              </Button>

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open in WhatsApp
                </a>
              )}
            </div>
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
              <AlertCircle className="w-4 h-4" />
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
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting}
              className="font-semibold text-xs cursor-pointer"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
