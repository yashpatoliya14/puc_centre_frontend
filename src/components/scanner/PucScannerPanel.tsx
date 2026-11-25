import React, { useState, useRef } from 'react';
import {
  Car,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Zap,
  Search,
  ArrowRight,
  Layers,
  X,
  AlertCircle,
} from 'lucide-react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

export interface ExtractedPucData {
  regNumber: string;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  fuelType?: 'Petrol' | 'Diesel' | 'CNG' | 'Electric' | string;
  vehicleType?: '2-Wheeler' | '4-Wheeler' | 'Commercial' | 'Other' | string;
  makeModel?: string;
  fullName?: string;
  mobileNumber?: string;
  insuranceCompany?: string;
  insuranceExpiry?: string;
  rawText?: string;
  fileName?: string;
}

interface PucScannerPanelProps {
  onExtracted?: (data: ExtractedPucData) => void;
  onBulkComplete?: () => void;
  initialTab?: 'vehicle' | 'upload';
  hideTabs?: boolean;
}

function playScanChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.17);
  } catch {
    // Ignore audio policy errors
  }
}

export function PucScannerPanel({
  onExtracted,
  onBulkComplete,
  initialTab = 'vehicle',
  hideTabs = false,
}: PucScannerPanelProps) {
  // 2 core options: 'vehicle' | 'upload' (unified for both PDF & Image with Bulk support)
  const [activeTab, setActiveTab] = useState<'vehicle' | 'upload'>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Option 1: Vehicle Number
  const [vehicleInput, setVehicleInput] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);

  // Option 2: Unified File Upload (PDF & Image, Single & Bulk)
  const [fileUploading, setFileUploading] = useState(false);
  const [fileDragActive, setFileDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Bulk Registration State
  const [bulkList, setBulkList] = useState<ExtractedPucData[]>([]);
  const [bulkRegistering, setBulkRegistering] = useState(false);

  const updateBulkItem = (index: number, field: keyof ExtractedPucData, value: string) => {
    setBulkList((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Single file success banner
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);

  const handleSuccess = (data: ExtractedPucData, source: string) => {
    playScanChime();
    if (onExtracted) {
      onExtracted(data);
    }

    const parts: string[] = [];
    if (data.regNumber) parts.push(data.regNumber);
    if (data.vehicleType) parts.push(data.vehicleType);
    if (data.fuelType) parts.push(data.fuelType);
    if (data.expiryDate) parts.push(`Exp: ${data.expiryDate}`);

    const summary = parts.join(' • ');
    setExtractedSummary(`${source}: ${summary}`);
    toast.success(`Details Auto-Filled: ${data.regNumber || 'Vehicle'}`, {
      description: `Extracted from ${source}`,
    });
  };

  // ---------------------------------------------------------------------------
  // 1. VEHICLE NUMBER LOOKUP
  // ---------------------------------------------------------------------------
  const handleVehicleLookup = async (overridePlate?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = overridePlate || vehicleInput;
    const clean = target.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!clean || clean.length < 5) {
      toast.error('Please enter a valid vehicle plate (e.g. GJ01AB1234)');
      return;
    }

    setVehicleLoading(true);
    try {
      const res = await apiRequest<{
        ok: boolean;
        data: ExtractedPucData & { source?: string; rtoLocation?: string };
      }>(`/api/scanner/lookup-vehicle?regNumber=${encodeURIComponent(clean)}`);

      if (res.ok && res.data) {
        handleSuccess(res.data, res.data.source || 'Vehicle Database');
        setVehicleInput('');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch vehicle specifications';
      toast.error(msg);
    } finally {
      setVehicleLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 2. EXTRACT SINGLE FILE (HELPER FOR BOTH PDF & IMAGE)
  // ---------------------------------------------------------------------------
  const extractSingleFile = async (file: File): Promise<ExtractedPucData | null> => {
    const isPdf = file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');

    if (isPdf) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiRequest<{ ok: boolean; data: ExtractedPucData }>(
          '/api/scanner/extract-pdf',
          {
            method: 'POST',
            body: formData,
            isFormData: true,
          },
        );
        if (res.ok && res.data) {
          return { ...res.data, fileName: file.name };
        }
      } catch (err) {
        console.warn(`PDF parse error for ${file.name}:`, err);
      }
      return null;
    }

    if (isImage) {
      return new Promise<ExtractedPucData | null>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          const img = new Image();
          img.onload = async () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);

              if (code && code.data) {
                try {
                  const res = await apiRequest<{ ok: boolean; data: ExtractedPucData }>(
                    '/api/scanner/extract-qr',
                    {
                      method: 'POST',
                      body: { qrText: code.data },
                    },
                  );
                  if (res.ok && res.data) {
                    resolve({ ...res.data, fileName: file.name });
                    return;
                  }
                } catch {
                  // Fallback to name heuristic
                }
              }

              // Fallback: check filename for plate number
              const match = file.name.match(/[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}/i);
              if (match) {
                try {
                  const res = await apiRequest<{ ok: boolean; data: ExtractedPucData }>(
                    `/api/scanner/lookup-vehicle?regNumber=${encodeURIComponent(match[0].toUpperCase())}`,
                  );
                  if (res.ok && res.data) {
                    resolve({ ...res.data, fileName: file.name });
                    return;
                  }
                } catch {
                  // Ignore
                }
              }
            }
            resolve(null);
          };
          img.onerror = () => resolve(null);
          img.src = dataUrl;
        };
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    }

    return null;
  };

  // ---------------------------------------------------------------------------
  // 3. UNIFIED FILE HANDLER (SINGLE FILE OR BULK MULTI-FILES)
  // ---------------------------------------------------------------------------
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList).filter(
      (f) =>
        f.name.toLowerCase().endsWith('.pdf') ||
        f.type === 'application/pdf' ||
        f.type.startsWith('image/'),
    );

    if (files.length === 0) {
      toast.error('Please select valid PUC PDF documents or Certificate Images (JPG, PNG, WebP)');
      return;
    }

    setFileUploading(true);
    setExtractedSummary(null);

    // CASE A: Single File -> Immediate Auto-Fill
    if (files.length === 1) {
      setUploadProgress('Extracting certificate details...');
      const extracted = await extractSingleFile(files[0]);
      setFileUploading(false);
      setUploadProgress(null);

      if (extracted && extracted.regNumber) {
        const fileTypeLabel = files[0].name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image';
        handleSuccess(extracted, `Parivahan ${fileTypeLabel}`);
      } else {
        toast.error(`Could not read certificate from ${files[0].name}`, {
          description: 'Ensure the Parivahan document has clear text or QR code',
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // CASE B: Multiple Files (BULK MODE) -> Process all in batch
    setUploadProgress(`Processing 0 / ${files.length} certificates...`);
    const successful: ExtractedPucData[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Extracting ${i + 1} / ${files.length}: ${file.name}...`);
      const res = await extractSingleFile(file);
      if (res && res.regNumber) {
        successful.push(res);
      }
    }

    setFileUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successful.length === 0) {
      toast.error(`Could not extract valid certificates from the ${files.length} selected files.`);
      return;
    }

    playScanChime();
    setBulkList(successful);
    toast.success(`Extracted ${successful.length} of ${files.length} certificates!`, {
      description: 'Review below and click "Register All Customers" to save all at once.',
    });
  };

  // ---------------------------------------------------------------------------
  // 4. SUBMIT BULK REGISTRATION TO BACKEND
  // ---------------------------------------------------------------------------
  const handleBulkRegisterAll = async () => {
    if (bulkList.length === 0) return;
    setBulkRegistering(true);

    try {
      const res = await apiRequest<{
        ok: boolean;
        total: number;
        registered: number;
        updated: number;
        failed: number;
      }>('/api/scanner/bulk-register', {
        method: 'POST',
        body: { certificates: bulkList },
      });

      if (res.ok) {
        toast.success(`Registered ${res.registered + res.updated} customers & vehicles!`, {
          description: `${res.registered} new profiles created, ${res.updated} renewals attached.`,
        });
        setBulkList([]);
        if (onBulkComplete) onBulkComplete();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Bulk registration failed';
      toast.error(msg);
    } finally {
      setBulkRegistering(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900/90 dark:to-slate-900/40 p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. Header & Segmented Switcher (Only 2 Tabs) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Auto-Fill & Bulk Registration
              </span>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40"
              >
                PDF & Image Bulk Enabled
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Fetch via vehicle plate, or upload single/bulk PDFs and Photos in one click
            </p>
          </div>
        </div>

        {/* 2 Clean Unified Tabs */}
        {!hideTabs && (
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto shadow-2xs">
            <button
              type="button"
              onClick={() => {
                setActiveTab('vehicle');
                setBulkList([]);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'vehicle'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>1. Vehicle Number</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
              <ImageIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 -ml-0.5" />
              <span>2. Upload PDF / Image</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Success Banner (Single File) */}
      {extractedSummary && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-50/90 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 truncate">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-semibold truncate">{extractedSummary}</span>
          </div>
          <button
            type="button"
            onClick={() => setExtractedSummary(null)}
            className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer shrink-0 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </button>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 1: VEHICLE NUMBER (Fast Plate Lookup)                             */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'vehicle' && (
        <div className="space-y-2.5 pt-0.5">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Styled Indian Plate Input Container */}
            <div className="relative flex-1 flex items-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:border-indigo-600 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:focus-within:border-indigo-500 shadow-2xs transition-all overflow-hidden">
              {/* Blue IND Strip */}
              <div className="h-full px-2.5 py-2 bg-[#003399] text-white flex flex-col items-center justify-center select-none shrink-0 border-r border-blue-800">
                <span className="text-[8px] font-black tracking-widest leading-none">IND</span>
                <span className="text-[10px] leading-none mt-0.5">🇮🇳</span>
              </div>

              <Input
                type="text"
                value={vehicleInput}
                onChange={(e) => setVehicleInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVehicleLookup();
                  }
                }}
                placeholder="GJ01AB1234"
                className="border-0 shadow-none focus-visible:ring-0 font-mono font-bold text-sm sm:text-base tracking-wider uppercase h-10 px-3 bg-transparent text-slate-900 dark:text-white"
              />

              {vehicleInput && (
                <button
                  type="button"
                  onClick={() => setVehicleInput('')}
                  className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs font-medium"
                >
                  Clear
                </button>
              )}
            </div>

            <Button
              type="button"
              onClick={() => handleVehicleLookup()}
              disabled={vehicleLoading || !vehicleInput || vehicleInput.trim().length < 5}
              className="h-10 px-4 font-semibold text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 shrink-0 gap-1.5 rounded-xl shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {vehicleLoading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Fetching...</span>
                </>
              ) : (
                <>
                  <Search className="h-3.5 w-3.5" />
                  <span>Fetch Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>

          {/* Quick Demo Plate Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Quick Test:</span>
            {['GJ01AB1234', 'GJ01BB7315', 'MH12CD5678'].map((plate) => (
              <button
                key={plate}
                type="button"
                onClick={() => {
                  setVehicleInput(plate);
                  handleVehicleLookup(plate);
                }}
                className="px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 cursor-pointer transition-colors"
              >
                {plate}
              </button>
            ))}
            <span className="text-[10px] text-slate-400 ml-auto hidden sm:inline">
              ⚡ Auto-detects Category, Fuel Type & Expiry
            </span>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* TAB 2: UNIFIED UPLOAD (ONE BUTTON SUPPORTING BOTH PDF & IMAGE + BULK) */}
      {/* --------------------------------------------------------------------- */}
      {activeTab === 'upload' && (
        <div className="space-y-3 pt-1">
          {/* Hidden input supporting BOTH PDF and Images, plus multiple files */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf,image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesSelected(e.target.files);
              }
            }}
          />

          {/* Unified Dropzone & Action Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setFileDragActive(true);
            }}
            onDragLeave={() => setFileDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setFileDragActive(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleFilesSelected(e.dataTransfer.files);
              }
            }}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer select-none ${
              fileDragActive
                ? 'border-indigo-600 bg-indigo-50/50 dark:border-indigo-400 dark:bg-indigo-950/40 scale-[0.99]'
                : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/20'
            }`}
          >
            {fileUploading ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
                <RefreshCw className="h-9 w-9 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  {uploadProgress || 'Extracting Certificate Details...'}
                </span>
                <span className="text-[11px] text-slate-500">
                  Parsing Parivahan documents & decoding certificate data
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-3">
                {/* Dual Badge Icon: PDF + Image */}
                <div className="flex items-center -space-x-2">
                  <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-xs z-10">
                    <FileText className="h-6 w-6" />
                  </div>
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                    Upload Parivahan PDF or Certificate Image
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Drop single or multiple files here, or{' '}
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline">
                      Browse Files
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                    .PDF
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                    .JPG / .PNG / .WebP
                  </Badge>
                  <Badge className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                    ⚡ Bulk Multi-Select Enabled
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* BULK REGISTRATION PREVIEW & 1-CLICK ACTION TABLE */}
          {bulkList.length > 0 && (
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/80 bg-indigo-50/40 dark:bg-indigo-950/30 p-3 sm:p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {bulkList.length} Certificates Ready to Register
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkList([])}
                    className="h-8 text-xs cursor-pointer"
                  >
                    Clear All
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={handleBulkRegisterAll}
                    disabled={bulkRegistering}
                    className="h-8 px-4 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    {bulkRegistering ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Registering...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="h-3 w-3" />
                        <span>Register All {bulkList.length} Customers</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Scrollable Mini Table */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase font-bold text-slate-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2">Plate</th>
                      <th className="px-3 py-2">Customer Name</th>
                      <th className="px-3 py-2">Mobile No</th>
                      <th className="px-3 py-2">Type / Fuel</th>
                      <th className="px-3 py-2">Expiry Date</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-[11px]">
                    {bulkList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {item.regNumber}
                        </td>
                        <td className="px-3 py-1.5 font-sans">
                          <input
                            type="text"
                            value={item.fullName || ''}
                            onChange={(e) => updateBulkItem(idx, 'fullName', e.target.value)}
                            placeholder="Owner Name"
                            className="w-full max-w-[140px] px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-1.5 font-mono">
                          <input
                            type="text"
                            value={item.mobileNumber || ''}
                            onChange={(e) => updateBulkItem(idx, 'mobileNumber', e.target.value)}
                            placeholder="Mobile No"
                            className="w-28 px-2 py-1 text-xs rounded border border-transparent hover:border-slate-300 focus:border-indigo-500 bg-transparent focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {item.vehicleType || '4W'} • {item.fuelType || 'Petrol'}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 font-medium">
                            {item.expiryDate || '—'}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkList(bulkList.filter((_, i) => i !== idx));
                            }}
                            className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remove"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
