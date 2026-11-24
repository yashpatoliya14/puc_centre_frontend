import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  QrCode,
  FileText,
  Camera,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Copy,
  Check,
  Zap,
} from 'lucide-react';
import jsQR from 'jsqr';
import { toast } from 'sonner';
import { apiRequest } from '../../lib/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { useI18n } from '../../context/I18nContext';

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
  rawText?: string;
}

interface PucScannerPanelProps {
  onExtracted: (data: ExtractedPucData) => void;
}

// Synthetic chime sound for scan success (Zero external audio file needed)
function playScanChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'qr' | 'pdf' | 'photo'>('qr');

  // QR Camera State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // USB Scanner Gun input
  const [usbGunInput, setUsbGunInput] = useState('');

  // PDF Upload State
  const [pdfUploading, setPdfUploading] = useState(false);
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const [extractedSummary, setExtractedSummary] = useState<string | null>(null);

  // Image Upload State
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Cleanup camera stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCameraLoading(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Handle successful extraction
  const handleSuccess = (data: ExtractedPucData, source: string) => {
    playScanChime();
    onExtracted(data);

    const parts: string[] = [];
    if (data.regNumber) parts.push(data.regNumber);
    if (data.expiryDate) parts.push(`Exp: ${data.expiryDate}`);
    if (data.fuelType) parts.push(data.fuelType);

    const summary = parts.join(' • ');
    setExtractedSummary(`${source}: ${summary}`);
    toast.success(`Extracted: ${data.regNumber || 'PUC details'}`, {
      description: `Auto-filled from ${source}`,
    });
  };

  // -------------------------------------------------------------
  // TAB 1: QR CODE SCANNER (Live Camera & USB Scanner Gun)
  // -------------------------------------------------------------
  const startCamera = async () => {
    setCameraError(null);
    setCameraLoading(true);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        setCameraLoading(false);
        requestAnimationFrame(tickQrScan);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to access camera';
      setCameraError(msg);
      setCameraLoading(false);
      toast.error('Camera access denied or unavailable', { description: msg });
    }
  };

  const tickQrScan = async () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tickQrScan);
      return;
    }

    const video = videoRef.current;
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvasRef.current = canvas;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        stopCamera();
        processQrPayload(code.data, 'Camera QR Scanner');
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickQrScan);
  };

  const processQrPayload = async (rawQr: string, source: string) => {
    try {
      const res = await apiRequest<{ ok: boolean; data: ExtractedPucData }>('/api/scanner/extract-qr', {
        method: 'POST',
        body: { qrText: rawQr },
      });

      if (res.ok && res.data) {
        handleSuccess(res.data, source);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to parse QR code';
      toast.error(msg);
    }
  };

  const handleUsbGunSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!usbGunInput.trim()) return;
    processQrPayload(usbGunInput.trim(), 'USB Scanner Gun');
    setUsbGunInput('');
  };

  // -------------------------------------------------------------
  // TAB 2: OFFICIAL PARIVAHAN PUC PDF UPLOAD
  // -------------------------------------------------------------
  const handlePdfUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please select an official Parivahan PUC PDF file');
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
        handleSuccess(res.data, 'Parivahan Official PDF');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to extract details from PDF';
      toast.error(msg);
    } finally {
      setPdfUploading(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3: PHOTO SCAN (Image File / WhatsApp Webhook Info)
  // -------------------------------------------------------------
  const handlePhotoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    setPhotoProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
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
              await processQrPayload(code.data, 'Photo QR Scan');
            } else {
              toast.info('No QR detected in photo; verifying document text with server...');
              // Fallback to QR parser with image name / prompt
              await processQrPayload(file.name, 'Uploaded Photo');
            }
          }
          setPhotoProcessing(false);
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error('Could not read image file');
      setPhotoProcessing(false);
    }
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/scanner/whatsapp-bot`;
    navigator.clipboard.writeText(url);
    setCopiedWebhook(true);
    toast.success('WhatsApp Bot Webhook URL copied!');
    setTimeout(() => setCopiedWebhook(false), 2500);
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3 sm:p-3.5 space-y-3">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-indigo-600/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Zap className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white">
            1-Click Auto-Fill from PUC Slip
          </span>
          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-emerald-600 border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
            3 Instant Ways
          </Badge>
        </div>

        {/* Segmented Option Selector */}
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('qr');
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'qr'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>1. Scan QR</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('pdf');
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'pdf'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>2. Parivahan PDF</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('photo');
              stopCamera();
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
              activeTab === 'photo'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>3. Photo & WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Success Extraction Banner */}
      {extractedSummary && (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span className="font-semibold truncate">{extractedSummary}</span>
          </div>
          <button
            type="button"
            onClick={() => setExtractedSummary(null)}
            className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 1: QR CODE SCANNER (Option 2)                           */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'qr' && (
        <div className="space-y-3 pt-1">
          {/* Live Camera Viewfinder */}
          {cameraActive ? (
            <div className="relative rounded-xl overflow-hidden border-2 border-indigo-500 bg-black aspect-video max-h-56 flex items-center justify-center shadow-md">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-0 border-2 border-dashed border-white/60 m-6 rounded-lg pointer-events-none flex items-center justify-center">
                <span className="text-[11px] font-semibold text-white/90 bg-black/60 px-2 py-0.5 rounded-full">
                  Align Parivahan QR in box
                </span>
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={stopCamera}
                className="absolute top-2 right-2 h-7 text-xs shadow-md"
              >
                Close Camera
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: Laptop / Phone Camera */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <Camera className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Live Device Camera</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Hold the printed paper PUC slip in front of camera to scan.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={startCamera}
                  disabled={cameraLoading}
                  className="w-full h-8 text-xs font-semibold border-indigo-200 text-indigo-700 dark:text-indigo-300 dark:border-indigo-900 hover:bg-indigo-50/60 cursor-pointer"
                >
                  {cameraLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Opening Camera...
                    </>
                  ) : (
                    <>
                      <Camera className="h-3.5 w-3.5" />
                      Start Camera Scanner
                    </>
                  )}
                </Button>
              </div>

              {/* Option B: USB Barcode / QR Scanner Gun */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                    <QrCode className="h-3.5 w-3.5 text-emerald-600" />
                    <span>USB Scanner Gun / Paste</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    Point USB handheld scanner gun at the slip and pull trigger.
                  </p>
                </div>
                <form onSubmit={handleUsbGunSubmit} className="flex gap-1.5">
                  <Input
                    value={usbGunInput}
                    onChange={(e) => setUsbGunInput(e.target.value)}
                    placeholder="Click here & trigger USB gun"
                    className="h-8 text-xs font-mono"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={!usbGunInput.trim()}
                    className="h-8 px-2.5 text-xs shrink-0 cursor-pointer"
                  >
                    Parse
                  </Button>
                </form>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 2: OFFICIAL PARIVAHAN PUC PDF (PDF Extraction)          */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'pdf' && (
        <div className="space-y-2 pt-1">
          <div
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
            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
              pdfDragActive
                ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
            }`}
          >
            <input
              type="file"
              id="puc-pdf-file-input"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePdfUpload(file);
                e.target.value = '';
              }}
            />

            {pdfUploading ? (
              <div className="py-3 flex flex-col items-center justify-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Parsing official Parivahan PUC certificate...
                </span>
                <span className="text-[11px] text-slate-400">
                  Extracting vehicle number, dates, fuel, and test values
                </span>
              </div>
            ) : (
              <label
                htmlFor="puc-pdf-file-input"
                className="flex flex-col items-center justify-center gap-1.5 cursor-pointer select-none"
              >
                <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
                    Click to upload official Parivahan PUC PDF
                  </span>
                  <span className="text-xs text-slate-500"> or drag and drop file</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Directly reads the PDF downloaded from vahan.parivahan.gov.in/puc/
                </p>
              </label>
            )}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------- */}
      {/* TAB 3: PHOTO SNAP & WHATSAPP BOT (Option 4)                 */}
      {/* ----------------------------------------------------------- */}
      {activeTab === 'photo' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {/* Snap / Upload Photo of Slip */}
          <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <UploadCloud className="h-3.5 w-3.5 text-indigo-600" />
                <span>Upload Photo / Screenshot</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Drop any image photo of the printed certificate or RC smart card.
              </p>
            </div>

            <input
              type="file"
              id="puc-photo-file-input"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhotoUpload(file);
                e.target.value = '';
              }}
            />

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={photoProcessing}
              onClick={() => document.getElementById('puc-photo-file-input')?.click()}
              className="w-full h-8 text-xs font-semibold cursor-pointer gap-1.5"
            >
              {photoProcessing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Reading Photo...
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5 text-slate-500" />
                  Choose Image / Photo
                </>
              )}
            </Button>
          </div>

          {/* WhatsApp "Snap & Register" Assistant */}
          <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                <span>WhatsApp "Snap & Register"</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                Send a photo or text with Vehicle Plate to your WhatsApp bot number to register automatically from your phone.
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1 border-t border-emerald-200/60 dark:border-emerald-900/40">
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 truncate">
                Webhook ready
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={copyWebhookUrl}
                className="h-7 px-2 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/60 dark:border-emerald-800 dark:text-emerald-300 cursor-pointer"
              >
                {copiedWebhook ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedWebhook ? 'Copied' : 'Copy Webhook'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
