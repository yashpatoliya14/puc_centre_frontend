import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import {
  Add,
  Clear,
  ContentCopy,
  DirectionsCar,
  EditOutlined,
  DeleteOutlined,
  ErrorOutlined,
  HourglassEmpty,
  Message,
  Phone,
  PhoneInTalk,
  Refresh,
  Search,
  Security,
  VerifiedUser,
  WarningAmber,
  OpenInNew,
  PersonOutlined,
  CheckCircle,
  Tune,
} from '@mui/icons-material';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { formatDateShort, todayIsoDate, addDaysIsoDate } from '../lib/utils';
import type { NavRoute } from '../components/layout/AppShell';
import { useI18n } from '../context/I18nContext';

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
 * Authentic Indian Vehicle Registration License Plate Component
 */
function IndianNumberPlate({ regNumber }: { regNumber: string }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'stretch',
        borderRadius: '6px',
        border: isDark ? '1.5px solid #334155' : '1.5px solid #0F172A',
        bgcolor: isDark ? '#0F172A' : '#FFFFFF',
        boxShadow: isDark
          ? '0 1px 3px rgba(0, 0, 0, 0.4)'
          : '0 1px 3px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        lineHeight: 1,
      }}
    >
      {/* IND Blue Strip */}
      <Box
        sx={{
          bgcolor: '#003399',
          color: '#FFFFFF',
          px: 0.65,
          py: 0.4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Typography
          sx={{
            fontSize: '0.55rem',
            fontWeight: 900,
            letterSpacing: '0.04em',
            lineHeight: 1,
          }}
        >
          IND
        </Typography>
      </Box>

      {/* Registration Code */}
      <Box
        sx={{
          px: 1,
          py: 0.4,
          display: 'flex',
          alignItems: 'center',
          bgcolor: isDark ? '#1E293B' : '#FFFFFF',
        }}
      >
        <Typography
          sx={{
            fontFamily: `'JetBrains Mono', 'Roboto Mono', monospace`,
            fontWeight: 800,
            fontSize: '0.8125rem',
            letterSpacing: '0.08em',
            color: isDark ? '#F8FAFC' : '#0F172A',
            lineHeight: 1,
            textTransform: 'uppercase',
          }}
        >
          {regNumber || '—'}
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Deterministic gradient avatar
 */
function getAvatarGradient(name: string) {
  const gradients = [
    'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
    'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
    'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    'linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)',
    'linear-gradient(135deg, #EC4899 0%, #BE185D 100%)',
  ];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return gradients[sum % gradients.length];
}

export function DashboardView({ onNavigate }: { onNavigate: (route: NavRoute) => void }) {
  const { t } = useI18n();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallMobile = useMediaQuery(theme.breakpoints.down('sm'));

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
    setExpiryDate(
      c.certificate?.expiryDate ? c.certificate.expiryDate.slice(0, 10) : addDaysIsoDate(todayIsoDate(), 180),
    );
    setCertNumber(c.certificate?.certificateNumber || '');

    if (c.insurance && c.insurance.policyNumber) {
      setHasInsurance(true);
      setPolicyNumber(c.insurance.policyNumber);
      if (COMMON_INSURERS.includes(c.insurance.insuranceCompany)) {
        setInsuranceCompany(c.insurance.insuranceCompany);
        setCustomCompany('');
      } else {
        setInsuranceCompany('Other');
        setCustomCompany(c.insurance.insuranceCompany);
      }
      setPolicyType(c.insurance.policyType || 'Comprehensive');
      setInsStartDate(c.insurance.startDate ? c.insurance.startDate.slice(0, 10) : todayIsoDate());
      setInsExpiryDate(
        c.insurance.expiryDate ? c.insurance.expiryDate.slice(0, 10) : addDaysIsoDate(todayIsoDate(), 365),
      );
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

    if (!fullName.trim()) {
      setFormError('Customer full name is required');
      return;
    }
    const cleanPhone = mobileNumber.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setFormError('Valid 10-digit mobile number required');
      return;
    }
    if (!regNumber.trim()) {
      setFormError('Vehicle registration number is required');
      return;
    }

    const resolvedCompany = insuranceCompany === 'Other' ? customCompany.trim() : insuranceCompany;
    if (hasInsurance) {
      if (!policyNumber.trim()) {
        setFormError('Policy Number is compulsory when insurance is enabled');
        return;
      }
      if (!resolvedCompany) {
        setFormError('Insurance Company is compulsory when insurance is enabled');
        return;
      }
      if (!insStartDate) {
        setFormError('Policy Start Date is compulsory when insurance is enabled');
        return;
      }
      if (!insExpiryDate) {
        setFormError('Policy Expiry Date is compulsory when insurance is enabled');
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
          autoCallProvider?: string;
        }>('/api/customers', {
          method: 'POST',
          body: payload,
        });

        if (createRes.autoCallPlaced) {
          toast.success(`Created customer: ${fullName}`, {
            description: `📞 Automatic onboarding call placed to +91 ${cleanPhone.slice(-10)} (${createRes.autoCallStatus || 'initiated'})`,
          });
        } else {
          toast.success(`Created customer: ${fullName}`);
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
      toast.success(`Phone call dialed to ${c.fullName} (${c.mobileNumber})`, {
        description: res.status ? `Exotel status: ${res.status}` : 'Connecting via Exotel API...',
      });
    } catch (err) {
      toast.error('Failed to dial customer', {
        description:
          err instanceof Error ? err.message : 'Please check Exotel credentials in Settings & Automation',
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
          body: { reminderType: finalType, type: finalType },
        },
      );
      setWhatsappPreview(res.messageText);
      setWhatsappUrl(res.whatsappUrl);
    } catch (err) {
      toast.error('Failed to generate WhatsApp reminder preview');
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const switchWhatsAppType = async (newType: 'puc' | 'insurance') => {
    if (!whatsappCustomer) return;
    setWhatsappType(newType);
    setLoadingWhatsapp(true);
    try {
      const res = await apiRequest<{ success: boolean; whatsappUrl: string; messageText: string }>(
        `/api/customers/${whatsappCustomer.id}/whatsapp`,
        {
          method: 'POST',
          body: { reminderType: newType, type: newType },
        },
      );
      setWhatsappPreview(res.messageText);
      setWhatsappUrl(res.whatsappUrl);
    } catch (err) {
      toast.error('Failed to generate template preview');
    } finally {
      setLoadingWhatsapp(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiRequest(`/api/customers/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success(`Deleted ${deleteTarget.fullName}`);
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete customer');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered customer list
  const filteredCustomers = useMemo(() => {
    let list = customers;

    if (activeFilter === 'expiring') {
      list = list.filter(
        (c) => c.certificate?.status === 'expiring_soon' || c.insurance?.status === 'expiring_soon',
      );
    } else if (activeFilter === 'expired') {
      list = list.filter((c) => c.certificate?.status === 'expired' || c.insurance?.status === 'expired');
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

  // Metric stats
  const stats = useMemo(() => {
    const total = customers.length;
    const pucExpiring = customers.filter((c) => c.certificate?.status === 'expiring_soon').length;
    const insExpiring = customers.filter((c) => c.insurance?.status === 'expiring_soon').length;
    const expiredCount = customers.filter((c) => c.certificate?.status === 'expired').length;
    const insuredTotal = customers.filter((c) => Boolean(c.insurance && c.insurance.policyNumber)).length;
    return { total, pucExpiring, insExpiring, expiredCount, insuredTotal };
  }, [customers]);

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    return filteredCustomers.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [filteredCustomers, page, rowsPerPage]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: { xs: 2.5, sm: 3.5 }, pb: 6 }}>
      {/* 1. Responsive Master Control Status Banner */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2, sm: 2.5, md: 3 },
          borderRadius: 3.5,
          background: isDark
            ? 'linear-gradient(135deg, #111827 0%, #1a1e36 60%, #111827 100%)'
            : 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 60%, #F8FAFC 100%)',
          border: '1px solid',
          borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(79, 70, 229, 0.2)',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em', fontSize: { xs: '1.2rem', sm: '1.5rem' } }}>
              PUC & Insurance Operations
            </Typography>
            <Chip
              size="small"
              label="Live Sync"
              sx={{
                height: 20,
                fontSize: '0.6875rem',
                fontWeight: 800,
                bgcolor: isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                color: '#10B981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
              }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}>
            Automated customer lifecycle management, Exotel voice dialer, and personalized WhatsApp notifications.
          </Typography>
        </Box>

        {/* Global Master Status Indicators */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', sm: 'flex-start' },
            flexWrap: 'wrap',
            gap: 1.5,
            p: 1.2,
            px: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            bgcolor: isDark ? 'rgba(0, 0, 0, 0.35)' : 'rgba(255, 255, 255, 0.85)',
            border: '1px solid',
            borderColor: 'divider',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Master Calls Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: settings?.callsEnabled !== false ? '#10B981' : '#94A3B8',
                animation: settings?.callsEnabled !== false ? 'pulseGlow 2s infinite' : 'none',
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.78125rem' }}>
              Calls:
            </Typography>
            <Chip
              size="small"
              label={settings?.callsEnabled !== false ? 'ACTIVE' : 'OFF'}
              color={settings?.callsEnabled !== false ? 'success' : 'default'}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
            />
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 0.5, display: { xs: 'none', sm: 'block' } }} />

          {/* Master WhatsApp Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: settings?.messagesEnabled !== false ? '#10B981' : '#94A3B8',
                animation: settings?.messagesEnabled !== false ? 'pulseGlow 2s infinite' : 'none',
              }}
            />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: '0.78125rem' }}>
              WhatsApp:
            </Typography>
            <Chip
              size="small"
              label={settings?.messagesEnabled !== false ? 'ACTIVE' : 'OFF'}
              color={settings?.messagesEnabled !== false ? 'success' : 'default'}
              sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
            />
          </Box>

          <Button
            size="small"
            variant="text"
            onClick={() => onNavigate('settings-general')}
            startIcon={<Tune fontSize="small" />}
            sx={{ fontWeight: 700, fontSize: '0.75rem', ml: 'auto' }}
          >
            Configure &rarr;
          </Button>
        </Box>
      </Paper>

      {/* 2. Responsive 4 KPI Metric Cards (2x2 on Mobile, 4x1 on Desktop) */}
      <Grid container spacing={{ xs: 1.5, sm: 2.5 }}>
        {/* Total Customers */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 4,
                bgcolor: 'primary.main',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark
                  ? '0 12px 24px -6px rgba(0, 0, 0, 0.6)'
                  : '0 12px 24px -6px rgba(99, 102, 241, 0.15)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, color: 'text.secondary', letterSpacing: '0.04em', fontSize: { xs: '0.6875rem', sm: '0.75rem' } }}
                >
                  {t('totalCustomers').toUpperCase()}
                </Typography>
                <Avatar
                  sx={{
                    width: { xs: 30, sm: 38 },
                    height: { xs: 30, sm: 38 },
                    bgcolor: isDark ? alpha('#6366F1', 0.15) : alpha('#6366F1', 0.1),
                    color: 'primary.main',
                  }}
                >
                  <PersonOutlined sx={{ fontSize: { xs: 18, sm: 22 } }} />
                </Avatar>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, mt: { xs: 1, sm: 1.5 }, fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                {stats.total}
              </Typography>
              <Typography noWrap variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Enrolled customers
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* PUC Expiring Soon */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 4,
                bgcolor: 'warning.main',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark
                  ? '0 12px 24px -6px rgba(0, 0, 0, 0.6)'
                  : '0 12px 24px -6px rgba(245, 158, 11, 0.15)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, color: 'warning.main', letterSpacing: '0.04em', fontSize: { xs: '0.6875rem', sm: '0.75rem' } }}
                >
                  {t('dueSoon').toUpperCase()}
                </Typography>
                <Avatar
                  sx={{
                    width: { xs: 30, sm: 38 },
                    height: { xs: 30, sm: 38 },
                    bgcolor: isDark ? alpha('#F59E0B', 0.15) : alpha('#F59E0B', 0.1),
                    color: 'warning.main',
                  }}
                >
                  <HourglassEmpty sx={{ fontSize: { xs: 18, sm: 22 } }} />
                </Avatar>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: { xs: 1, sm: 1.5 }, color: 'warning.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                {stats.pucExpiring}
              </Typography>
              <Typography noWrap variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Due in next 7 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Insured Vehicles */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 4,
                bgcolor: 'secondary.main',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark
                  ? '0 12px 24px -6px rgba(0, 0, 0, 0.6)'
                  : '0 12px 24px -6px rgba(14, 165, 233, 0.15)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, color: 'secondary.main', letterSpacing: '0.04em', fontSize: { xs: '0.6875rem', sm: '0.75rem' } }}
                >
                  WITH INSURANCE
                </Typography>
                <Avatar
                  sx={{
                    width: { xs: 30, sm: 38 },
                    height: { xs: 30, sm: 38 },
                    bgcolor: isDark ? alpha('#0EA5E9', 0.15) : alpha('#0EA5E9', 0.1),
                    color: 'secondary.main',
                  }}
                >
                  <Security sx={{ fontSize: { xs: 18, sm: 22 } }} />
                </Avatar>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: { xs: 1, sm: 1.5 }, color: 'secondary.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                {stats.insuredTotal}
              </Typography>
              <Typography noWrap variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {stats.insExpiring} due in 15d
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Expired Certificates */}
        <Grid size={{ xs: 6, sm: 6, md: 3 }}>
          <Card
            sx={{
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                bottom: 0,
                width: 4,
                bgcolor: 'error.main',
              },
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: isDark
                  ? '0 12px 24px -6px rgba(0, 0, 0, 0.6)'
                  : '0 12px 24px -6px rgba(239, 68, 68, 0.15)',
              },
            }}
          >
            <CardContent sx={{ p: { xs: 1.5, sm: 2.5 } }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, color: 'error.main', letterSpacing: '0.04em', fontSize: { xs: '0.6875rem', sm: '0.75rem' } }}
                >
                  {t('filterExpired').toUpperCase()}
                </Typography>
                <Avatar
                  sx={{
                    width: { xs: 30, sm: 38 },
                    height: { xs: 30, sm: 38 },
                    bgcolor: isDark ? alpha('#EF4444', 0.15) : alpha('#EF4444', 0.1),
                    color: 'error.main',
                  }}
                >
                  <WarningAmber sx={{ fontSize: { xs: 18, sm: 22 } }} />
                </Avatar>
              </Box>
              <Typography
                variant="h4"
                sx={{ fontWeight: 800, mt: { xs: 1, sm: 1.5 }, color: 'error.main', fontSize: { xs: '1.5rem', sm: '2rem' } }}
              >
                {stats.expiredCount}
              </Typography>
              <Typography noWrap variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                Immediate call needed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. Search Bar, Filter Chips & Create Customer Action */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 1.5,
        }}
      >
        <TextField
          size="small"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(0);
          }}
          sx={{ width: { xs: '100%', md: 360 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setSearchQuery('')}>
                    <Clear fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        {/* Scrollable Filter Chips Container on Mobile */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            overflowX: 'auto',
            pb: { xs: 0.5, md: 0 },
            '&::-webkit-scrollbar': { display: 'none' },
            msOverflowStyle: 'none',
            scrollbarWidth: 'none',
          }}
        >
          <Chip
            label={`${t('filterAll')} (${customers.length})`}
            onClick={() => {
              setActiveFilter('all');
              setPage(0);
            }}
            color={activeFilter === 'all' ? 'primary' : 'default'}
            variant={activeFilter === 'all' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />
          <Chip
            icon={<HourglassEmpty fontSize="small" />}
            label={`${t('filterExpiringSoon')} (${stats.pucExpiring})`}
            onClick={() => {
              setActiveFilter('expiring');
              setPage(0);
            }}
            color={activeFilter === 'expiring' ? 'warning' : 'default'}
            variant={activeFilter === 'expiring' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />
          <Chip
            icon={<ErrorOutlined fontSize="small" />}
            label={`${t('filterExpired')} (${stats.expiredCount})`}
            onClick={() => {
              setActiveFilter('expired');
              setPage(0);
            }}
            color={activeFilter === 'expired' ? 'error' : 'default'}
            variant={activeFilter === 'expired' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />
          <Chip
            icon={<Security fontSize="small" />}
            label={`Insured (${stats.insuredTotal})`}
            onClick={() => {
              setActiveFilter('insured');
              setPage(0);
            }}
            color={activeFilter === 'insured' ? 'secondary' : 'default'}
            variant={activeFilter === 'insured' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 700, flexShrink: 0 }}
          />

          <Button
            variant="contained"
            onClick={openCreateModal}
            startIcon={<Add />}
            sx={{
              borderRadius: 2.5,
              px: 2.5,
              py: 0.8,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {t('registerCustomer')}
          </Button>

          <IconButton onClick={loadData} title="Refresh customer database" size="small" sx={{ flexShrink: 0 }}>
            <Refresh fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* 4A. Desktop Data Table (Shown on screens >= md) */}
      <Paper sx={{ width: '100%', overflow: 'hidden', borderRadius: 3.5, display: { xs: 'none', md: 'block' } }}>
        <TableContainer sx={{ minHeight: 420 }}>
          <Table stickyHeader size="medium">
            <TableHead>
              <TableRow>
                <TableCell>{t('colCustomer')}</TableCell>
                <TableCell>{t('colVehicle')}</TableCell>
                <TableCell>{t('colPucExpiry')}</TableCell>
                <TableCell>{t('colInsurance')}</TableCell>
                <TableCell align="right">{t('colActions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Skeleton variant="circular" width={38} height={38} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton width="60%" />
                          <Skeleton width="40%" />
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Skeleton width={110} height={28} />
                      <Skeleton width={80} sx={{ mt: 0.5 }} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={120} />
                      <Skeleton width={70} />
                    </TableCell>
                    <TableCell>
                      <Skeleton width={120} />
                      <Skeleton width={90} />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton width={130} sx={{ ml: 'auto' }} />
                    </TableCell>
                  </TableRow>
                ))
              ) : paginatedCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 10, textAlign: 'center' }}>
                    <Box sx={{ maxWidth: 360, mx: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 56,
                          height: 56,
                          bgcolor: isDark ? alpha('#6366F1', 0.15) : alpha('#6366F1', 0.1),
                          color: 'primary.main',
                          mb: 1,
                        }}
                      >
                        <PersonOutlined fontSize="large" />
                      </Avatar>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        No customers found
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {searchQuery
                          ? `No results match "${searchQuery}". Clear search or try another keyword.`
                          : 'Your customer directory is empty. Add your first customer and vehicle.'}
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={openCreateModal}
                        startIcon={<Add />}
                        sx={{ mt: 1, borderRadius: 2.5 }}
                      >
                        Create First Customer
                      </Button>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedCustomers.map((c) => {
                  const pucDays = c.certificate?.daysUntilExpiry;
                  const isPucExpired = pucDays !== undefined && pucDays < 0;
                  const isPucExpSoon = pucDays !== undefined && pucDays >= 0 && pucDays <= 7;

                  const hasIns = Boolean(c.insurance && c.insurance.policyNumber);
                  const insDays = c.insurance?.daysUntilExpiry;
                  const isInsExpired = insDays !== null && insDays !== undefined && insDays < 0;
                  const isInsExpSoon = insDays !== null && insDays !== undefined && insDays >= 0 && insDays <= 15;

                  const initials = c.fullName
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((w) => w[0].toUpperCase())
                    .join('');

                  return (
                    <TableRow hover key={c.id}>
                      {/* Customer Details */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar
                            sx={{
                              width: 38,
                              height: 38,
                              background: getAvatarGradient(c.fullName),
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '0.84375rem',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                            }}
                          >
                            {initials || 'C'}
                          </Avatar>
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                                {c.fullName}
                              </Typography>
                              <Chip
                                size="small"
                                label={c.language.toUpperCase()}
                                sx={{
                                  height: 18,
                                  fontSize: '0.625rem',
                                  fontWeight: 800,
                                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                                }}
                              />
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                              <Phone sx={{ fontSize: 13, color: 'text.secondary' }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: `'JetBrains Mono', monospace`,
                                  color: 'text.secondary',
                                  fontWeight: 600,
                                }}
                              >
                                +91 {c.mobileNumber}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* Vehicle License Plate */}
                      <TableCell>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 0.6 }}>
                          <IndianNumberPlate regNumber={c.vehicle?.registrationNumber || '—'} />
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                            <DirectionsCar sx={{ fontSize: 13, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                              {c.vehicle?.vehicleType || 'Vehicle'}{' '}
                              {c.vehicle?.fuelType ? `• ${c.vehicle.fuelType}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>

                      {/* PUC Certificate */}
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {formatDateShort(c.certificate?.expiryDate)}
                          </Typography>

                          {isPucExpired ? (
                            <Chip
                              size="small"
                              color="error"
                              icon={<ErrorOutlined sx={{ fontSize: '13px !important' }} />}
                              label={`Expired ${Math.abs(pucDays || 0)}d`}
                              sx={{ fontWeight: 800 }}
                            />
                          ) : isPucExpSoon ? (
                            <Chip
                              size="small"
                              color="warning"
                              icon={<HourglassEmpty sx={{ fontSize: '13px !important' }} />}
                              label={`${pucDays}d left`}
                              sx={{ fontWeight: 800 }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              color="success"
                              icon={<CheckCircle sx={{ fontSize: '13px !important' }} />}
                              label="Active"
                              sx={{ fontWeight: 800 }}
                            />
                          )}
                        </Box>
                        {c.certificate?.certificateNumber && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontFamily: 'monospace', display: 'block', mt: 0.3 }}
                          >
                            Cert: #{c.certificate.certificateNumber}
                          </Typography>
                        )}
                      </TableCell>

                      {/* Vehicle Insurance */}
                      <TableCell>
                        {hasIns && c.insurance ? (
                          <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                                {c.insurance.insuranceCompany}
                              </Typography>
                              {isInsExpired ? (
                                <Chip size="small" color="error" label="Expired" sx={{ fontWeight: 800, height: 20 }} />
                              ) : isInsExpSoon ? (
                                <Chip
                                  size="small"
                                  color="warning"
                                  label={`${insDays}d left`}
                                  sx={{ fontWeight: 800, height: 20 }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  color="secondary"
                                  label="Covered"
                                  sx={{ fontWeight: 800, height: 20 }}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontFamily: 'monospace', display: 'block', mt: 0.2 }}
                            >
                              Pol: {c.insurance.policyNumber} ({c.insurance.policyType})
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              Exp: {formatDateShort(c.insurance.expiryDate)}
                              {c.insurance.premiumAmount ? ` • ₹${c.insurance.premiumAmount}` : ''}
                            </Typography>
                          </Box>
                        ) : (
                          <Chip
                            size="small"
                            variant="outlined"
                            label="No Policy"
                            sx={{ color: 'text.secondary', fontWeight: 600, height: 22 }}
                          />
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
                          <Tooltip title="Direct Phone Call via Exotel">
                            <span>
                              <Button
                                size="small"
                                variant="outlined"
                                color="success"
                                onClick={() => handleDirectCall(c)}
                                disabled={callingId === c.id}
                                startIcon={
                                  callingId === c.id ? (
                                    <CircularProgress size={14} color="inherit" />
                                  ) : (
                                    <PhoneInTalk fontSize="small" />
                                  )
                                }
                                sx={{
                                  borderRadius: 2,
                                  fontWeight: 800,
                                  px: 1.5,
                                  py: 0.4,
                                  borderColor: isDark ? 'rgba(16, 185, 129, 0.4)' : '#10B981',
                                  color: isDark ? '#34D399' : '#059669',
                                  '&:hover': {
                                    bgcolor: isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.08)',
                                    borderColor: '#10B981',
                                  },
                                }}
                              >
                                {callingId === c.id ? 'Calling...' : 'Call'}
                              </Button>
                            </span>
                          </Tooltip>

                          <Tooltip title="Send WhatsApp Reminder">
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => openWhatsAppDialog(c, hasIns && isInsExpSoon ? 'insurance' : 'puc')}
                              startIcon={<Message fontSize="small" />}
                              sx={{
                                borderRadius: 2,
                                fontWeight: 800,
                                px: 1.5,
                                py: 0.4,
                                bgcolor: '#25D366',
                                color: '#FFFFFF',
                                '&:hover': {
                                  bgcolor: '#1EBE5D',
                                  boxShadow: '0 4px 12px rgba(37, 211, 102, 0.35)',
                                },
                              }}
                            >
                              WhatsApp
                            </Button>
                          </Tooltip>

                          <Tooltip title="Edit Customer & Details">
                            <IconButton
                              size="small"
                              onClick={() => openEditModal(c)}
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'primary.main', bgcolor: alpha('#6366F1', 0.1) },
                              }}
                            >
                              <EditOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Delete Customer">
                            <IconButton
                              size="small"
                              onClick={() => setDeleteTarget(c)}
                              sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'error.main', bgcolor: alpha('#EF4444', 0.1) },
                              }}
                            >
                              <DeleteOutlined fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 15, 25, 50]}
          component="div"
          count={filteredCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>

      {/* 4B. Mobile / Tablet Responsive Customer Cards (Shown on screens < md) */}
      <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => (
            <Card key={idx} sx={{ p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="40%" />
                </Box>
              </Box>
              <Skeleton height={32} />
              <Skeleton height={20} sx={{ mt: 1 }} />
            </Card>
          ))
        ) : paginatedCustomers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: alpha('#6366F1', 0.1),
                color: 'primary.main',
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <PersonOutlined />
            </Avatar>
            <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
              No customers found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              {searchQuery ? `No matches for "${searchQuery}"` : 'Your customer list is currently empty.'}
            </Typography>
            <Button variant="contained" onClick={openCreateModal} startIcon={<Add />} sx={{ borderRadius: 2.5 }}>
              Create Customer
            </Button>
          </Paper>
        ) : (
          paginatedCustomers.map((c) => {
            const pucDays = c.certificate?.daysUntilExpiry;
            const isPucExpired = pucDays !== undefined && pucDays < 0;
            const isPucExpSoon = pucDays !== undefined && pucDays >= 0 && pucDays <= 7;

            const hasIns = Boolean(c.insurance && c.insurance.policyNumber);
            const insDays = c.insurance?.daysUntilExpiry;
            const isInsExpired = insDays !== null && insDays !== undefined && insDays < 0;
            const isInsExpSoon = insDays !== null && insDays !== undefined && insDays >= 0 && insDays <= 15;

            const initials = c.fullName
              .split(' ')
              .filter(Boolean)
              .slice(0, 2)
              .map((w) => w[0].toUpperCase())
              .join('');

            return (
              <Card
                key={c.id}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
                }}
              >
                {/* Header: Avatar, Name, Language, Action icons */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 40,
                        height: 40,
                        background: getAvatarGradient(c.fullName),
                        color: '#FFFFFF',
                        fontWeight: 800,
                        fontSize: '0.875rem',
                      }}
                    >
                      {initials || 'C'}
                    </Avatar>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                          {c.fullName}
                        </Typography>
                        <Chip
                          size="small"
                          label={c.language.toUpperCase()}
                          sx={{ height: 18, fontSize: '0.625rem', fontWeight: 800 }}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.3 }}>
                        <Phone sx={{ fontSize: 13, color: 'text.secondary' }} />
                        <Typography
                          component="a"
                          href={`tel:+91${c.mobileNumber}`}
                          variant="caption"
                          sx={{
                            fontFamily: `'JetBrains Mono', monospace`,
                            color: 'primary.main',
                            fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          +91 {c.mobileNumber}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => openEditModal(c)}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => setDeleteTarget(c)} color="error">
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>

                <Divider sx={{ my: 1.2 }} />

                {/* Vehicle & Expiry Details */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, my: 1.2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IndianNumberPlate regNumber={c.vehicle?.registrationNumber || '—'} />
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {c.vehicle?.vehicleType}
                    </Typography>
                  </Box>

                  {/* PUC Status Pill */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>
                      PUC: {formatDateShort(c.certificate?.expiryDate)}
                    </Typography>
                    {isPucExpired ? (
                      <Chip
                        size="small"
                        color="error"
                        label={`Expired ${Math.abs(pucDays || 0)}d`}
                        sx={{ fontWeight: 800, height: 20, fontSize: '0.6875rem' }}
                      />
                    ) : isPucExpSoon ? (
                      <Chip
                        size="small"
                        color="warning"
                        label={`${pucDays}d left`}
                        sx={{ fontWeight: 800, height: 20, fontSize: '0.6875rem' }}
                      />
                    ) : (
                      <Chip
                        size="small"
                        color="success"
                        label="Active"
                        sx={{ fontWeight: 800, height: 20, fontSize: '0.6875rem' }}
                      />
                    )}
                  </Box>
                </Box>

                {/* Insurance status bar if available */}
                {hasIns && c.insurance && (
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      bgcolor: isDark ? 'rgba(14, 165, 233, 0.08)' : 'rgba(14, 165, 233, 0.05)',
                      border: '1px solid',
                      borderColor: isDark ? 'rgba(14, 165, 233, 0.2)' : 'rgba(14, 165, 233, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      mt: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Security fontSize="small" color="secondary" />
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: 'secondary.main', display: 'block' }}>
                          {c.insurance.insuranceCompany} ({c.insurance.policyType})
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                          Pol: {c.insurance.policyNumber}
                        </Typography>
                      </Box>
                    </Box>

                    {isInsExpired ? (
                      <Chip size="small" color="error" label="Expired" sx={{ height: 20, fontWeight: 800 }} />
                    ) : isInsExpSoon ? (
                      <Chip size="small" color="warning" label={`${insDays}d left`} sx={{ height: 20, fontWeight: 800 }} />
                    ) : (
                      <Chip size="small" color="secondary" label="Covered" sx={{ height: 20, fontWeight: 800 }} />
                    )}
                  </Box>
                )}

                {/* Bottom Full Touch Action Buttons */}
                <Box sx={{ display: 'flex', gap: 1, mt: 1.8 }}>
                  <Button
                    fullWidth
                    size="medium"
                    variant="outlined"
                    color="success"
                    onClick={() => handleDirectCall(c)}
                    disabled={callingId === c.id}
                    startIcon={
                      callingId === c.id ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <PhoneInTalk fontSize="small" />
                      )
                    }
                    sx={{ borderRadius: 2, fontWeight: 800, py: 0.8 }}
                  >
                    {callingId === c.id ? 'Calling...' : 'Direct Call'}
                  </Button>

                  <Button
                    fullWidth
                    size="medium"
                    variant="contained"
                    onClick={() => openWhatsAppDialog(c, hasIns && isInsExpSoon ? 'insurance' : 'puc')}
                    startIcon={<Message fontSize="small" />}
                    sx={{
                      borderRadius: 2,
                      fontWeight: 800,
                      py: 0.8,
                      bgcolor: '#25D366',
                      color: '#FFFFFF',
                      '&:hover': { bgcolor: '#1EBE5D' },
                    }}
                  >
                    WhatsApp
                  </Button>
                </Box>
              </Card>
            );
          })
        )}

        {/* Mobile Pagination */}
        <TablePagination
          rowsPerPageOptions={[10, 15, 25]}
          component="div"
          count={filteredCustomers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          sx={{ borderTop: 1, borderColor: 'divider', mt: 1 }}
        />
      </Box>

      {/* 5. Create / Edit Customer Dialog (Responsive fullScreen on phones) */}
      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isSmallMobile}
        slotProps={{ paper: { sx: { borderRadius: { xs: 0, sm: 4 } } } }}
      >
        <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>
          {editingCustomer ? `Edit Customer: ${editingCustomer.fullName}` : t('addCustomerTitle')}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.3 }}>
            {t('addCustomerDesc')}
          </Typography>
        </DialogTitle>

        <Box component="form" onSubmit={handleSaveCustomer}>
          <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: { xs: 2, sm: 3 } }}>
            {formError && (
              <Alert severity="error" sx={{ borderRadius: 2 }}>
                {formError}
              </Alert>
            )}

            {/* Section 1: Customer Profile */}
            <Box>
              <Typography
                variant="subtitle2"
                color="primary.main"
                sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '0.04em' }}
              >
                1. CUSTOMER INFORMATION
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Customer Full Name *"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Mobile Number (10 Digits) *"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="7043333359"
                    required
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start">+91</InputAdornment>,
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="lang-label">Preferred Reminder Language</InputLabel>
                    <Select
                      labelId="lang-label"
                      label="Preferred Reminder Language"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value as 'gu' | 'hi' | 'en')}
                    >
                      <MenuItem value="gu">Gujarati (ગુજરાતી) — Default</MenuItem>
                      <MenuItem value="hi">Hindi (हिंदी)</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Section 2: Vehicle & PUC Details */}
            <Box>
              <Typography
                variant="subtitle2"
                color="primary.main"
                sx={{ fontWeight: 800, mb: 1.5, letterSpacing: '0.04em' }}
              >
                2. VEHICLE & PUC CERTIFICATE
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Vehicle Registration Plate *"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. GJ01AB1234"
                    required
                    slotProps={{
                      htmlInput: {
                        style: { textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 800 },
                      },
                    }}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="vtype-label">Vehicle Type *</InputLabel>
                    <Select
                      labelId="vtype-label"
                      label="Vehicle Type *"
                      value={vehicleType}
                      onChange={(e) => setVehicleType(e.target.value)}
                    >
                      <MenuItem value="2-Wheeler">2-Wheeler (Motorcycle / Scooter)</MenuItem>
                      <MenuItem value="4-Wheeler Petrol">4-Wheeler Petrol</MenuItem>
                      <MenuItem value="4-Wheeler Diesel">4-Wheeler Diesel</MenuItem>
                      <MenuItem value="4-Wheeler CNG">4-Wheeler CNG</MenuItem>
                      <MenuItem value="Commercial">Commercial / Transport</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="fuel-label">Fuel Type</InputLabel>
                    <Select
                      labelId="fuel-label"
                      label="Fuel Type"
                      value={fuelType}
                      onChange={(e) => setFuelType(e.target.value)}
                    >
                      <MenuItem value="Petrol">Petrol</MenuItem>
                      <MenuItem value="Diesel">Diesel</MenuItem>
                      <MenuItem value="CNG">CNG</MenuItem>
                      <MenuItem value="Electric">Electric</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="PUC Issue Date *"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="PUC Expiry Date *"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    slotProps={{ inputLabel: { shrink: true } }}
                    required
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Certificate Number (Optional)"
                    value={certNumber}
                    onChange={(e) => setCertNumber(e.target.value)}
                    placeholder="e.g. GJ01-PUC-2026-90812"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Section 3: Optional Vehicle Insurance */}
            <Box>
              <Paper
                variant="outlined"
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: 3,
                  bgcolor: hasInsurance
                    ? isDark
                      ? alpha('#0EA5E9', 0.1)
                      : alpha('#0EA5E9', 0.05)
                    : 'transparent',
                  borderColor: hasInsurance ? 'secondary.main' : 'divider',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: hasInsurance ? 'secondary.main' : 'action.disabledBackground',
                        color: hasInsurance ? '#FFFFFF' : 'text.disabled',
                      }}
                    >
                      <Security fontSize="small" />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                        Include Vehicle Insurance
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Optional to enable. When checked, policy details are mandatory.
                      </Typography>
                    </Box>
                  </Box>
                  <Switch
                    checked={hasInsurance}
                    onChange={(e) => setHasInsurance(e.target.checked)}
                    color="secondary"
                  />
                </Box>

                {hasInsurance && (
                  <Box sx={{ mt: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Alert severity="info" sx={{ fontSize: '0.8125rem', py: 0.5, borderRadius: 2 }}>
                      Policy details marked with * are mandatory for insured customers.
                    </Alert>

                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Policy Number *"
                          value={policyNumber}
                          onChange={(e) => setPolicyNumber(e.target.value)}
                          placeholder="e.g. 2314/00098765/000/00"
                          required={hasInsurance}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="ins-comp-label">Insurance Company *</InputLabel>
                          <Select
                            labelId="ins-comp-label"
                            label="Insurance Company *"
                            value={insuranceCompany}
                            onChange={(e) => setInsuranceCompany(e.target.value)}
                            required={hasInsurance}
                          >
                            {COMMON_INSURERS.map((comp) => (
                              <MenuItem key={comp} value={comp}>
                                {comp}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      {insuranceCompany === 'Other' && (
                        <Grid size={{ xs: 12 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Enter Insurance Company Name *"
                            value={customCompany}
                            onChange={(e) => setCustomCompany(e.target.value)}
                            required={hasInsurance}
                          />
                        </Grid>
                      )}

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="ins-type-label">Policy Type *</InputLabel>
                          <Select
                            labelId="ins-type-label"
                            label="Policy Type *"
                            value={policyType}
                            onChange={(e) => setPolicyType(e.target.value)}
                            required={hasInsurance}
                          >
                            <MenuItem value="Comprehensive">Comprehensive</MenuItem>
                            <MenuItem value="Third-Party Only">Third-Party Only</MenuItem>
                            <MenuItem value="Zero Depreciation">Zero Depreciation</MenuItem>
                            <MenuItem value="Own Damage">Own Damage</MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Policy Start Date *"
                          type="date"
                          value={insStartDate}
                          onChange={(e) => setInsStartDate(e.target.value)}
                          slotProps={{ inputLabel: { shrink: true } }}
                          required={hasInsurance}
                        />
                      </Grid>

                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Policy Expiry Date *"
                          type="date"
                          value={insExpiryDate}
                          onChange={(e) => setInsExpiryDate(e.target.value)}
                          slotProps={{ inputLabel: { shrink: true } }}
                          required={hasInsurance}
                        />
                      </Grid>

                      <Grid size={{ xs: 12 }}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Premium Amount (₹ Optional)"
                          type="number"
                          value={premiumAmount}
                          onChange={(e) => setPremiumAmount(e.target.value)}
                          placeholder="e.g. 1850"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Paper>
            </Box>
          </DialogContent>

          <DialogActions sx={{ p: { xs: 2, sm: 2.5 } }}>
            <Button onClick={() => setModalOpen(false)} disabled={submitting}>
              {t('cancel')}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ borderRadius: 2.5, px: 3, fontWeight: 800 }}
            >
              {submitting ? (
                <CircularProgress size={20} color="inherit" />
              ) : editingCustomer ? (
                'Save Changes'
              ) : (
                t('saveCustomer')
              )}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* 6. Realistic WhatsApp Simulator Dialog */}
      <Dialog
        open={Boolean(whatsappCustomer)}
        onClose={() => setWhatsappCustomer(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: { xs: 2.5, sm: 4 }, overflow: 'hidden', m: { xs: 1.5, sm: 2 } } } }}
      >
        {/* WhatsApp Emerald Top Bar */}
        <Box
          sx={{
            bgcolor: '#075E54',
            color: '#FFFFFF',
            px: { xs: 2, sm: 2.5 },
            py: 1.8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 38,
                height: 38,
                bgcolor: '#128C7E',
                color: '#FFFFFF',
                fontWeight: 800,
              }}
            >
              {whatsappCustomer?.fullName.slice(0, 2).toUpperCase() || 'WP'}
            </Avatar>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2, fontSize: '0.9375rem' }}>
                {whatsappCustomer?.fullName}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.8)', fontWeight: 500 }}>
                +91 {whatsappCustomer?.mobileNumber} • Online
              </Typography>
            </Box>
          </Box>

          <Chip
            size="small"
            label="WhatsApp Web"
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '0.6875rem',
            }}
          />
        </Box>

        <DialogContent
          sx={{
            p: { xs: 2, sm: 3 },
            bgcolor: isDark ? '#0B141A' : '#EFEAE2',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Template Choice Tabs */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              fullWidth
              size="small"
              variant={whatsappType === 'puc' ? 'contained' : 'outlined'}
              onClick={() => switchWhatsAppType('puc')}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                bgcolor: whatsappType === 'puc' ? '#128C7E' : 'transparent',
                borderColor: '#128C7E',
                color: whatsappType === 'puc' ? '#FFFFFF' : '#128C7E',
                '&:hover': { bgcolor: '#075E54', color: '#FFFFFF' },
              }}
            >
              PUC Reminder
            </Button>
            <Button
              fullWidth
              size="small"
              variant={whatsappType === 'insurance' ? 'contained' : 'outlined'}
              disabled={!whatsappCustomer?.insurance}
              onClick={() => switchWhatsAppType('insurance')}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                bgcolor: whatsappType === 'insurance' ? '#0284C7' : 'transparent',
                borderColor: '#0284C7',
                color: whatsappType === 'insurance' ? '#FFFFFF' : '#0284C7',
                '&:hover': { bgcolor: '#0369A1', color: '#FFFFFF' },
              }}
            >
              Insurance {!whatsappCustomer?.insurance && '(No Policy)'}
            </Button>
          </Box>

          {/* Authentic WhatsApp Message Bubble */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 0.5 }}>
            <Paper
              elevation={2}
              sx={{
                p: 2,
                maxWidth: '96%',
                borderRadius: '16px 16px 16px 4px',
                bgcolor: isDark ? '#005C4B' : '#FFFFFF',
                color: isDark ? '#E9EDEF' : '#111B21',
                boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)',
              }}
            >
              {loadingWhatsapp ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 3, px: 6 }}>
                  <CircularProgress size={24} color="inherit" />
                </Box>
              ) : (
                <Box>
                  <Typography
                    sx={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '0.875rem',
                      lineHeight: 1.6,
                      fontFamily: `'Segoe UI', Helvetica, Arial, sans-serif`,
                    }}
                  >
                    {whatsappPreview || 'Generating personalized reminder...'}
                  </Typography>

                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: 0.5,
                      mt: 1,
                      opacity: 0.7,
                    }}
                  >
                    <Typography sx={{ fontSize: '0.6875rem' }}>Just now</Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#53BDEB' }}>✓✓</Typography>
                  </Box>
                </Box>
              )}
            </Paper>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: { xs: 1.5, sm: 2.5 }, bgcolor: isDark ? '#111827' : '#F8FAFC', flexWrap: 'wrap', gap: 1 }}>
          <Button onClick={() => setWhatsappCustomer(null)}>Cancel</Button>

          <Button
            variant="outlined"
            onClick={() => {
              if (whatsappPreview) {
                navigator.clipboard.writeText(whatsappPreview);
                toast.success('Message copied to clipboard');
              }
            }}
            startIcon={<ContentCopy fontSize="small" />}
            sx={{ borderRadius: 2.5 }}
          >
            Copy
          </Button>

          <Button
            variant="contained"
            disabled={loadingWhatsapp || !whatsappUrl}
            onClick={() => {
              if (whatsappUrl) {
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                setWhatsappCustomer(null);
                toast.success('Opening WhatsApp Web / App...');
              }
            }}
            startIcon={<OpenInNew fontSize="small" />}
            sx={{
              borderRadius: 2.5,
              px: { xs: 2, sm: 3 },
              fontWeight: 800,
              bgcolor: '#25D366',
              color: '#FFFFFF',
              '&:hover': { bgcolor: '#1EBE5D' },
            }}
          >
            Open in WhatsApp
          </Button>
        </DialogActions>
      </Dialog>

      {/* 7. Delete Customer Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        slotProps={{ paper: { sx: { borderRadius: 4, maxWidth: 440, m: 2 } } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Delete Customer: {deleteTarget?.fullName}?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: '0.875rem' }}>
            Are you sure you want to delete this customer? This will remove all vehicle certificates, scheduled reminder
            calls, and insurance records permanently.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteCustomer}
            disabled={deleting}
            sx={{ borderRadius: 2.5, fontWeight: 800 }}
          >
            {deleting ? <CircularProgress size={20} color="inherit" /> : 'Delete Customer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
