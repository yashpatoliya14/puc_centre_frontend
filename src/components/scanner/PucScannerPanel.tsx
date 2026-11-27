import React, { useState, useRef } from 'react';
import {
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  RefreshCw,
  Zap,
  Layers,
  X,
} from 'lucide-react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';
import { Button } from '../ui/button';
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
  initialTab?: 'upload';
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

function tryDecodeQrFromImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const trySize = (w: number, h: number): string | null => {
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return null;
          ctx.drawImage(img, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'attemptBoth',
          });
          return code?.data || null;
        };

        const direct = trySize(img.width, img.height);
        if (direct) {
          resolve(direct);
          return;
        }

        // Retry scaled down for very high-res phone photos
        if (img.width > 1400 || img.height > 1400) {
          const scale = 1200 / Math.max(img.width, img.height);
          const scaled = trySize(Math.round(img.width * scale), Math.round(img.height * scale));
          if (scaled) {
            resolve(scaled);
            return;
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

function mergeExtracted(primary: Partial<ExtractedPucData>, secondary: Partial<ExtractedPucData>): ExtractedPucData {
  return {
    regNumber: primary.regNumber || secondary.regNumber || '',
    certificateNumber: primary.certificateNumber || secondary.certificateNumber || '',
    issueDate: primary.issueDate || secondary.issueDate || '',
    expiryDate: primary.expiryDate || secondary.expiryDate || '',
    fuelType: primary.fuelType || secondary.fuelType || 'Petrol',
    vehicleType: primary.vehicleType || secondary.vehicleType || '4-Wheeler',
    makeModel: primary.makeModel || secondary.makeModel || '',
    fullName: primary.fullName || secondary.fullName || '',
    mobileNumber: primary.mobileNumber || secondary.mobileNumber || '',
    insuranceCompany: primary.insuranceCompany || secondary.insuranceCompany,
    insuranceExpiry: primary.insuranceExpiry || secondary.insuranceExpiry,
    rawText: primary.rawText || secondary.rawText,
  };
}

export function PucScannerPanel({
  onExtracted,
  onBulkComplete,
}: PucScannerPanelProps) {
  // Unified File Upload (PDF & Image, Single & Bulk)
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
  // EXTRACT SINGLE FILE (PDF + IMAGE QR & OCR)
  // ---------------------------------------------------------------------------
  const extractSingleFile = async (
    file: File,
  ): Promise<{ data: ExtractedPucData | null; error?: string }> => {
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
        if (res.ok && res.data && res.data.regNumber) {
          return { data: { ...res.data, fileName: file.name } };
        }
        return { data: null, error: 'Could not find vehicle registration number in PDF' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'PDF extraction failed';
        console.warn(`PDF parse error for ${file.name}:`, err);
        return { data: null, error: msg };
      }
    }

    if (isImage) {
      let qrData: Partial<ExtractedPucData> | null = null;
      const qrText = await tryDecodeQrFromImage(file);
      if (qrText) {
        try {
          const res = await apiRequest<{ ok: boolean; data: ExtractedPucData }>(
            '/api/scanner/extract-qr',
            {
              method: 'POST',
              body: { qrText },
            },
          );
          if (res.ok && res.data) {
            qrData = res.data;
          }
        } catch {
          // Proceed to OCR
        }
      }

      // Run OCR if QR wasn't found or is missing key details (e.g. regNumber, owner name, or expiry)
      let ocrData: Partial<ExtractedPucData> | null = null;
      let ocrError: string | undefined;
      if (!qrData?.regNumber || !qrData?.fullName || !qrData?.expiryDate) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await apiRequest<{ ok: boolean; data: ExtractedPucData }>(
            '/api/scanner/extract-image',
            {
              method: 'POST',
              body: formData,
              isFormData: true,
            },
          );
          if (res.ok && res.data) {
            ocrData = res.data;
          }
        } catch (err) {
          ocrError = err instanceof Error ? err.message : 'Image OCR request failed';
          console.warn(`Image OCR error for ${file.name}:`, err);
        }
      }

      if (qrData || ocrData) {
        const merged = mergeExtracted(qrData || {}, ocrData || {});
        if (merged.regNumber) {
          return { data: { ...merged, fileName: file.name } };
        }
      }
      return {
        data: null,
        error: ocrError || 'Ensure the Parivahan document has clear text or QR code',
      };
    }

    return { data: null, error: 'Unsupported file format' };
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
      const { data: extracted, error } = await extractSingleFile(files[0]);
      setFileUploading(false);
      setUploadProgress(null);

      if (extracted && extracted.regNumber) {
        const fileTypeLabel = files[0].name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image';
        handleSuccess(extracted, `Parivahan ${fileTypeLabel}`);
      } else {
        toast.error(`Could not read certificate from ${files[0].name}`, {
          description: error || 'Ensure the Parivahan document has clear text or QR code',
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // CASE B: Multiple Files (BULK MODE) -> Process all in batch
    setUploadProgress(`Processing 0 / ${files.length} certificates...`);
    const successful: ExtractedPucData[] = [];
    let lastError: string | undefined;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`Extracting ${i + 1} / ${files.length}: ${file.name}...`);
      const { data, error } = await extractSingleFile(file);
      if (data && data.regNumber) {
        successful.push(data);
      } else if (error) {
        lastError = error;
      }
    }

    setFileUploading(false);
    setUploadProgress(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    if (successful.length === 0) {
      toast.error(`Could not extract valid certificates from the ${files.length} selected files.`, {
        description: lastError,
      });
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
    <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-gradient-to-b from-white to-zinc-50/60 dark:from-[#0e0e11] dark:to-[#09090b] p-4 sm:p-5 shadow-xs space-y-4">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/70 border border-blue-100 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                PDF & Image Certificate Extractor
              </span>
              <Badge
                variant="outline"
                className="text-[10px] py-0 px-2 font-semibold text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/40"
              >
                PDF & Image Bulk Enabled
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Success Banner (Single File) */}
      {extractedSummary && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 text-xs shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5 truncate">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold truncate">{extractedSummary}</span>
          </div>
          <button
            type="button"
            onClick={() => setExtractedSummary(null)}
            className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:underline cursor-pointer shrink-0 flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            Dismiss
          </button>
        </div>
      )}

      {/* UNIFIED UPLOAD (PDF & IMAGE + BULK) */}
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
                ? 'border-blue-600 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/40 scale-[0.99]'
                : 'border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-black hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/20'
            }`}
          >
            {fileUploading ? (
              <div className="flex flex-col items-center justify-center py-2 space-y-2.5">
                <RefreshCw className="h-9 w-9 text-blue-600 dark:text-blue-400 animate-spin" />
                <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {uploadProgress || 'Extracting Certificate Details...'}
                </span>
                <span className="text-[11px] text-zinc-500">
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
                  <div className="h-12 w-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Upload Parivahan PDF or Certificate Image
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                    Drop single or multiple files here, or{' '}
                    <span className="font-semibold text-blue-600 dark:text-blue-400 underline">
                      Browse Files
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  <Badge variant="outline" className="text-[10px] font-mono text-zinc-500">
                    .PDF
                  </Badge>
                  <Badge variant="outline" className="text-[10px] font-mono text-zinc-500">
                    .JPG / .PNG / .WebP
                  </Badge>
                  <Badge className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    ⚡ Bulk Multi-Select Enabled
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* BULK REGISTRATION PREVIEW & 1-CLICK ACTION TABLE */}
          {bulkList.length > 0 && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/80 bg-blue-50/40 dark:bg-blue-950/30 p-3 sm:p-4 space-y-3 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
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
                    className="h-8 px-4 font-bold text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
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
              <div className="max-h-56 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-xs shadow-2xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 dark:bg-[#0e0e11] border-b border-zinc-200 dark:border-zinc-800 text-[10px] uppercase font-bold text-zinc-500 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2">Plate</th>
                      <th className="px-3 py-2">Customer Name</th>
                      <th className="px-3 py-2">Mobile No</th>
                      <th className="px-3 py-2">Type / Fuel</th>
                      <th className="px-3 py-2">Expiry Date</th>
                      <th className="px-2 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80 text-[11px]">
                    {bulkList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50/60 dark:hover:bg-zinc-900/60 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-zinc-900 dark:text-white whitespace-nowrap">
                          {item.regNumber}
                        </td>
                        <td className="px-3 py-1.5 font-sans">
                          <input
                            type="text"
                            value={item.fullName || ''}
                            onChange={(e) => updateBulkItem(idx, 'fullName', e.target.value)}
                            placeholder="Owner Name"
                            className="w-full max-w-[140px] px-2 py-1 text-xs rounded border border-transparent hover:border-zinc-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-1.5 font-mono">
                          <input
                            type="text"
                            value={item.mobileNumber || ''}
                            onChange={(e) => updateBulkItem(idx, 'mobileNumber', e.target.value)}
                            placeholder="Mobile No"
                            className="w-28 px-2 py-1 text-xs rounded border border-transparent hover:border-zinc-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
                          />
                        </td>
                        <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                          {item.vehicleType || '4W'} • {item.fuelType || 'Petrol'}
                        </td>
                        <td className="px-3 py-1.5 whitespace-nowrap">
                          <input
                            type="date"
                            value={item.expiryDate || ''}
                            onChange={(e) => updateBulkItem(idx, 'expiryDate', e.target.value)}
                            className="px-1.5 py-0.5 text-[11px] font-mono rounded border border-transparent hover:border-zinc-300 focus:border-blue-500 bg-transparent focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-colors"
                          />
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setBulkList(bulkList.filter((_, i) => i !== idx));
                            }}
                            className="text-zinc-400 hover:text-red-500 dark:hover:text-red-400 cursor-pointer p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
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
    </div>
  );
}
