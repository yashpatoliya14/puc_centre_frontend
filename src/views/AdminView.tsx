import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Users,
  Search,
  Ban,
  CheckCircle2,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Car,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiRequest } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '../components/ui/table';

interface OwnerSummary {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  mobileNumber: string;
  address: string;
  isBlocked: boolean;
  blockedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  customerCount: number;
  vehicleCount: number;
  activeCertCount: number;
}

interface OwnersResponse {
  items: OwnerSummary[];
  summary: {
    totalOwners: number;
    activeOwners: number;
    blockedOwners: number;
    totalCustomers: number;
  };
}

interface OwnerCustomer {
  id: string;
  fullName: string;
  mobileNumber: string;
  language: string;
  status: string;
  vehicleRegistrationNumber: string;
  vehicleType: string;
  fuelType: string;
  certificateNumber: string;
  issueDate: string;
  expiryDate: string;
  certificateStatus: 'active' | 'expiring_today' | 'expiring_soon' | 'expired' | 'renewed';
  daysUntilExpiry: number;
  insurance: {
    policyNumber: string;
    insuranceCompany: string;
    expiryDate: string;
  } | null;
  createdAt: string;
}

interface OwnerCustomersResponse {
  owner: {
    id: string;
    businessName: string;
    ownerName: string;
    email: string;
    mobileNumber: string;
    isBlocked: boolean;
  };
  items: OwnerCustomer[];
}

export function AdminView() {
  const [owners, setOwners] = useState<OwnerSummary[]>([]);
  const [summary, setSummary] = useState({
    totalOwners: 0,
    activeOwners: 0,
    blockedOwners: 0,
    totalCustomers: 0,
  });
  const [loadingOwners, setLoadingOwners] = useState(true);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [togglingOwnerId, setTogglingOwnerId] = useState<string | null>(null);

  // Selected owner for owner-wise customer display
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>('');
  const [selectedOwnerInfo, setSelectedOwnerInfo] = useState<OwnerCustomersResponse['owner'] | null>(null);
  const [ownerCustomers, setOwnerCustomers] = useState<OwnerCustomer[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');

  const loadOwners = useCallback(async () => {
    setLoadingOwners(true);
    try {
      const res = await apiRequest<OwnersResponse>('/api/admin/owners');
      setOwners(res.items || []);
      if (res.summary) setSummary(res.summary);
      setSelectedOwnerId((prev) => {
        if (prev && res.items.some((o) => o.id === prev)) return prev;
        return res.items[0]?.id || '';
      });
    } catch (err) {
      toast.error('Failed to load PUC centre owners', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoadingOwners(false);
    }
  }, []);

  const loadOwnerCustomers = useCallback(async (tenantId: string) => {
    if (!tenantId) {
      setSelectedOwnerInfo(null);
      setOwnerCustomers([]);
      return;
    }
    setLoadingCustomers(true);
    try {
      const res = await apiRequest<OwnerCustomersResponse>(
        `/api/admin/owners/${tenantId}/customers`,
      );
      setSelectedOwnerInfo(res.owner);
      setOwnerCustomers(res.items || []);
    } catch (err) {
      toast.error('Failed to load owner customers', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setLoadingCustomers(false);
    }
  }, []);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  useEffect(() => {
    if (selectedOwnerId) {
      loadOwnerCustomers(selectedOwnerId);
    }
  }, [selectedOwnerId, loadOwnerCustomers]);

  const handleToggleBlock = async (owner: { id: string; businessName: string; isBlocked: boolean }) => {
    setTogglingOwnerId(owner.id);
    const action = owner.isBlocked ? 'unblock' : 'block';
    try {
      await apiRequest(`/api/admin/owners/${owner.id}/${action}`, { method: 'POST' });
      toast.success(
        owner.isBlocked
          ? `Unblocked ${owner.businessName}`
          : `Blocked ${owner.businessName}`,
        {
          description: owner.isBlocked
            ? 'Owner can now sign in and manage their centre.'
            : 'Owner sessions revoked and login access disabled.',
        },
      );
      await loadOwners();
      if (selectedOwnerId === owner.id) {
        await loadOwnerCustomers(owner.id);
      }
    } catch (err) {
      toast.error(`Failed to ${action} owner`, {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setTogglingOwnerId(null);
    }
  };

  const filteredOwners = useMemo(() => {
    const q = ownerSearch.trim().toLowerCase();
    return owners.filter((o) => {
      if (statusFilter === 'active' && o.isBlocked) return false;
      if (statusFilter === 'blocked' && !o.isBlocked) return false;
      if (!q) return true;
      return (
        o.businessName.toLowerCase().includes(q) ||
        o.ownerName.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.mobileNumber.toLowerCase().includes(q)
      );
    });
  }, [owners, ownerSearch, statusFilter]);

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return ownerCustomers;
    return ownerCustomers.filter(
      (c) =>
        c.fullName.toLowerCase().includes(q) ||
        c.mobileNumber.toLowerCase().includes(q) ||
        c.vehicleRegistrationNumber.toLowerCase().includes(q) ||
        c.certificateNumber.toLowerCase().includes(q),
    );
  }, [ownerCustomers, customerSearch]);

  const renderCertStatusBadge = (status: OwnerCustomer['certificateStatus']) => {
    switch (status) {
      case 'expired':
        return <Badge variant="destructive" className="text-[10px]">Expired</Badge>;
      case 'expiring_today':
        return <Badge className="text-[10px] bg-amber-500 text-white">Expiring Today</Badge>;
      case 'expiring_soon':
        return <Badge className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">Due Soon</Badge>;
      case 'renewed':
        return <Badge className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">Renewed</Badge>;
      default:
        return <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Active</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Admin Control Panel
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage all PUC centre owners, block or unblock accounts, and inspect customers owner-wise.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            loadOwners();
            if (selectedOwnerId) loadOwnerCustomers(selectedOwnerId);
          }}
          disabled={loadingOwners}
          className="h-9 gap-1.5 text-xs font-semibold cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingOwners ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">PUC Centre Owners</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.totalOwners}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Owners</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{summary.activeOwners}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Blocked Owners</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.blockedOwners}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Customers</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{summary.totalCustomers}</p>
            </div>
            <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 1: ALL PUC CENTRE OWNERS */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-400" />
                PUC Centre Owners
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Block or unblock owner access and click an owner to view their customers below.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={ownerSearch}
                  onChange={(e) => setOwnerSearch(e.target.value)}
                  placeholder="Search centre, owner, email..."
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 text-xs">
                {(['all', 'active', 'blocked'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-md font-medium capitalize transition-colors cursor-pointer ${
                      statusFilter === st
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/60">
                  <TableHead>PUC Centre</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Controls</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingOwners ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      Loading PUC centre owners...
                    </TableCell>
                  </TableRow>
                ) : filteredOwners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                      No PUC centre owners match your filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOwners.map((owner) => {
                    const isSelected = selectedOwnerId === owner.id;
                    const busy = togglingOwnerId === owner.id;
                    return (
                      <TableRow
                        key={owner.id}
                        className={
                          isSelected
                            ? 'bg-indigo-50/50 dark:bg-indigo-950/20'
                            : 'hover:bg-slate-50/60 dark:hover:bg-slate-900/40'
                        }
                      >
                        <TableCell>
                          <div className="font-semibold text-xs text-slate-900 dark:text-white">
                            {owner.businessName}
                          </div>
                          {owner.address && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5 max-w-[220px] truncate">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span className="truncate">{owner.address}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {owner.ownerName}
                        </TableCell>
                        <TableCell>
                          <div className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{owner.email}</span>
                          </div>
                          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{owner.mobileNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[11px]">
                            {owner.customerCount} customers
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {owner.isBlocked ? (
                            <Badge variant="destructive" className="text-[10px] gap-1">
                              <Ban className="w-3 h-3" />
                              Blocked
                            </Badge>
                          ) : (
                            <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button
                              type="button"
                              variant={isSelected ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setSelectedOwnerId(owner.id)}
                              className="h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                            >
                              <Eye className="w-3 h-3" />
                              Customers
                            </Button>

                            {owner.isBlocked ? (
                              <Button
                                type="button"
                                size="sm"
                                disabled={busy}
                                onClick={() => handleToggleBlock(owner)}
                                className="h-7 px-2.5 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                {busy ? 'Updating...' : 'Unblock'}
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={busy}
                                onClick={() => handleToggleBlock(owner)}
                                className="h-7 px-2.5 text-[11px] gap-1 cursor-pointer"
                              >
                                <Ban className="w-3 h-3" />
                                {busy ? 'Updating...' : 'Block'}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: OWNER-WISE CUSTOMERS */}
      <Card className="border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Owner-Wise Customers
                {selectedOwnerInfo && (
                  <Badge variant="secondary" className="text-[11px]">
                    {selectedOwnerInfo.businessName} ({selectedOwnerInfo.ownerName})
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Select a PUC centre owner to inspect all their registered customers and vehicles.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedOwnerId}
                onChange={(e) => setSelectedOwnerId(e.target.value)}
                className="h-8 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium text-slate-700 dark:text-slate-200"
              >
                {owners.length === 0 ? (
                  <option value="">No owners available</option>
                ) : (
                  owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.businessName} — {o.ownerName} ({o.customerCount})
                    </option>
                  ))
                )}
              </select>

              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customer or plate..."
                  className="pl-8 h-8 text-xs"
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-900/60">
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>PUC Certificate</TableHead>
                  <TableHead>PUC Status</TableHead>
                  <TableHead>Insurance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingCustomers ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                      Loading customers...
                    </TableCell>
                  </TableRow>
                ) : !selectedOwnerId ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                      Select an owner above to view their customers.
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-xs text-slate-500">
                      No customers found for this PUC centre owner.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((c) => (
                    <TableRow key={c.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/40">
                      <TableCell>
                        <div className="font-semibold text-xs text-slate-900 dark:text-white">
                          {c.fullName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mt-0.5">
                          {c.mobileNumber}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          <span>{c.vehicleRegistrationNumber || '—'}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {c.vehicleType} • {c.fuelType}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                          {c.expiryDate || '—'}
                        </div>
                        {c.certificateNumber && (
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {c.certificateNumber}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{renderCertStatusBadge(c.certificateStatus)}</TableCell>
                      <TableCell>
                        {c.insurance ? (
                          <div>
                            <div className="text-xs text-slate-700 dark:text-slate-300">
                              {c.insurance.insuranceCompany}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {c.insurance.policyNumber} • Exp: {c.insurance.expiryDate}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
