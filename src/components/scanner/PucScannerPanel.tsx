import React, { useState, useRef } from 'react';
import {
  Car,
  FileText,
  Image as ImageIcon,
  UploadCloud,
  CheckCircle2,
  RefreshCw,
  Zap,
  Search,
  Sparkles,
  ArrowRight,
  FileCheck,
  X,
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
}

interface PucScannerPanelProps {
  onExtracted: (data: ExtractedPucData) => void;
}

// Synthetic chime sound for scan success
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

export function PucScannerPanel({ onExtracted }: PucScannerPanelProps) {
  // Only 3 options: 'vehicle' | 'pdf' | 'image'
  const [activeTab, setActiveTab] = useState<'vehicle' | 'pdf' | 'image'>('vehicle');

  // Option 1: Vehicle Number
  const [vehicleInput, setVehicleInput] = useState('');
  const [vehicleLoading, setVehicleLoading] = useState(false);

  // Option 2: PDF Upload
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  // Option 3: Image Upload
  const [imageProcessing, setImageProcessing] = useState(false);
  const [imageDragActive, setImageDragActive] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  // Success summary banner
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);

  const handleSuccess = (data: ExtractedPucData, source: string) => {
    playScanChime();
    onExtracted(data);

    const parts: string[] = [];
    if (data.regNumber) parts.push(data.regNumber);
    if (data.vehicleType) parts.push(data.vehicleType);
    if (data.fuelType) parts.push(data.fuelType);
    if (data.expiryDate) parts.push(`Exp: ${data.expiryDate}`);

    const summary = parts.join(' • ');
    setExtractedSummary(`${source}: ${summary}`);
    toast.success(`Details Auto-Filled: ${data.regNumber || 'Vehicle'}`, {
      description: `Extracted via ${source}`,
    });
  };

  // ---------------------------------------------------------------------------
  // OPTION 1: VEHICLE NUMBER LOOKUP
  // ---------------------------------------------------------------------------
  const handleVehicleLookup = async (overridePlate?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const target = overridePlate || vehicleInput;
    const clean = target.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    if (!clean || clean.length < 5) {
      toast.error('Please enter a valid vehicle plate number (e.g. GJ01AB1234)');
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
  // OPTION 2: PARIVAHAN PUC PDF EXTRACTION
  // ---------------------------------------------------------------------------
  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload an official Parivahan PUC PDF document');
      return;
    }

    setPdfUploading(true);
    setExtractedSummary(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await apiRequest<{ ok: boolean; data: ExtractedPucData; filename: string }>(
        '/api/scanner/extract-pdf',
        {
          method: 'POST',
          body: formData,
          isFormData: true,
        },
      );

      if (res.ok && res.data) {
        handleSuccess(res.data, 'Official Parivahan PDF');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract certificate from PDF';
      toast.error(msg);
    } finally {
      setPdfUploading(false);
      if (pdfInputRef.current) pdfInputRef.current.value = '';
    }
  };

  // ---------------------------------------------------------------------------
  // OPTION 3: CERTIFICATE IMAGE EXTRACTION (QR & DETAILS)
  // ---------------------------------------------------------------------------
  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    setImageProcessing(true);
    setExtractedSummary(null);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setImagePreview(dataUrl);

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
                  handleSuccess(res.data, 'Certificate Image QR');
                  setImageProcessing(false);
                  return;
                }
              } catch {
                // Fallback to name extraction below
              }
            }

            // Fallback: extract vehicle plate heuristics from filename or prompt
            const match = file.name.match(/[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}/i);
            if (match) {
              await handleVehicleLookup(match[0].toUpperCase());
            } else {
              toast.info('Image uploaded. If QR was faint, type the plate number above.');
            }
          }
          setImageProcessing(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Could not process image file');
      setImageProcessing(false);
    } finally {
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900/90 dark:to-slate-900/40 p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. Header & Segmented Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-100 dark:border-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Auto-Fill Customer & Vehicle
              </span>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/40"
              >
                3 Extraction Modes
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Select an option to automatically populate details without manual typing
            </p>
          </div>
        </div>

        {/* 3 Clean Tabs */}
        <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('vehicle')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'vehicle'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Car className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Vehicle Number</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pdf'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>Extract PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'image'
                ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Extract Image</span>
          </button>
        </div>
      </div>

      {/* 2. Success Banner */}
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

      {/* 3. TAB 1: VEHICLE NUMBER (Fast Plate Lookup) */}
      {activeTab === 'vehicle' && (
        <div className="space-y-3 pt-1">
          <form
            onSubmit={(e) => handleVehicleLookup(undefined, e)}
            className="flex flex-col sm:flex-row gap-2.5"
          >
            {/* Styled Indian Plate Input Container */}
            <div className="relative flex-1 flex items-center rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 shadow-2xs transition-all overflow-hidden">
              {/* Blue IND Strip */}
              <div className="h-full px-2.5 py-2.5 bg-blue-600 text-white flex flex-col items-center justify-center select-none shrink-0 border-r border-blue-700">
                <span className="text-[8px] font-bold tracking-widest leading-none">IND</span>
                <span className="text-[10px] leading-none mt-0.5">🇮🇳</span>
              </div>

              <Input
                type="text"
                value={vehicleInput}
                onChange={(e) => setVehicleInput(e.target.value.toUpperCase())}
                placeholder="GJ01AB1234"
                className="border-0 shadow-none focus-visible:ring-0 font-mono font-bold text-base tracking-wider uppercase h-10 px-3 bg-transparent text-slate-900 dark:text-white"
                autoFocus
              />

              {vehicleInput && (
                <button
                  type="button"
                  onClick={() => setVehicleInput('')}
                  className="pr-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            <Button
              type="submit"
              disabled={vehicleLoading || !vehicleInput || vehicleInput.trim().length < 5}
              className="h-11 px-5 font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-500 dark:hover:bg-indigo-600 shrink-0 gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
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
          </form>

          {/* Quick Demo Plate Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-xs">
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
              ⚡ Auto-detects Category, Fuel Type & 1-Year Expiry
            </span>
          </div>
        </div>
      )}

      {/* 4. TAB 2: PARIVAHAN PUC PDF EXTRACTION */}
      {activeTab === 'pdf' && (
        <div className="space-y-3 pt-1">
          <input
            ref={pdfInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePdfUpload(file);
            }}
          />

          <div
            onClick={() => pdfInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setPdfDragActive(true);
            }}
            onDragLeave={() => setPdfDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setPdfDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handlePdfUpload(file);
            }}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer select-none ${
              pdfDragActive
                ? 'border-indigo-600 bg-indigo-50/40 dark:border-indigo-400 dark:bg-indigo-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/20'
            }`}
          >
            {pdfUploading ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
                <RefreshCw className="h-8 w-8 text-indigo-600 dark:text-indigo-400 animate-spin" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Parsing Official Parivahan PDF...
                </span>
                <span className="text-[11px] text-slate-500">
                  Extracting vehicle plate, certificate number, fuel type & validity
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-100 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                    Drop Official Parivahan PUC PDF here
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    or <span className="font-semibold text-indigo-600 dark:text-indigo-400 underline">Browse PDF from computer</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                    Parivahan / mParivahan PDF • Up to 10MB
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. TAB 3: CERTIFICATE IMAGE EXTRACTION */}
      {activeTab === 'image' && (
        <div className="space-y-3 pt-1">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
            }}
          />

          <div
            onClick={() => imageInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setImageDragActive(true);
            }}
            onDragLeave={() => setImageDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setImageDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleImageUpload(file);
            }}
            className={`border-2 border-dashed rounded-2xl p-6 sm:p-7 text-center transition-all cursor-pointer select-none ${
              imageDragActive
                ? 'border-emerald-600 bg-emerald-50/40 dark:border-emerald-400 dark:bg-emerald-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/40 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/20'
            }`}
          >
            {imageProcessing ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
                <RefreshCw className="h-8 w-8 text-emerald-600 dark:text-emerald-400 animate-spin" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Scanning Certificate Image...
                </span>
                <span className="text-[11px] text-slate-500">
                  Detecting Parivahan QR code & vehicle details
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-100 dark:border-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                  <ImageIcon className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                    Drop Certificate Photo / Screenshot here
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    or <span className="font-semibold text-emerald-600 dark:text-emerald-400 underline">Browse Image file</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                    JPG, PNG, WebP • Auto-Scans Parivahan QR Barcode
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
