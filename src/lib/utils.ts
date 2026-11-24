import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDateShort(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return '—';
  const datePart = isoOrDate.slice(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return isoOrDate;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d).padStart(2, '0')} ${months[m - 1]} ${y}`;
}

export function formatDateTimeIst(iso: string | null | undefined): string {
  if (!iso) return '—';
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return iso;
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(dt);
}

export function formatDuration(seconds: number | null | undefined): string {
  const s = Number(seconds || 0);
  if (s <= 0) return '0s';
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
}

export function languageLabel(code: string | null | undefined): string {
  if (code === 'gu') return 'Gujarati';
  if (code === 'hi') return 'Hindi';
  if (code === 'en') return 'English';
  return code || 'Gujarati';
}

export function callStatusMeta(status: string): { label: string; textClass: string } {
  switch (status) {
    case 'completed':
      return { label: 'Completed', textClass: 'text-emerald-600 dark:text-emerald-400' };
    case 'answered':
      return { label: 'Answered', textClass: 'text-emerald-600 dark:text-emerald-400' };
    case 'ringing':
      return { label: 'Ringing', textClass: 'text-indigo-600 dark:text-indigo-400' };
    case 'initiated':
      return { label: 'Initiated', textClass: 'text-indigo-600 dark:text-indigo-400' };
    case 'queued':
      return { label: 'Queued', textClass: 'text-slate-600 dark:text-slate-300' };
    case 'scheduled':
      return { label: 'Scheduled', textClass: 'text-slate-600 dark:text-slate-300' };
    case 'retrying':
      return { label: 'Retrying', textClass: 'text-amber-600 dark:text-amber-400' };
    case 'no_answer':
      return { label: 'No Answer', textClass: 'text-amber-600 dark:text-amber-400' };
    case 'busy':
      return { label: 'Busy', textClass: 'text-amber-600 dark:text-amber-400' };
    case 'failed':
      return { label: 'Failed', textClass: 'text-red-600 dark:text-red-400' };
    case 'cancelled':
      return { label: 'Cancelled', textClass: 'text-slate-500 dark:text-slate-400' };
    default:
      return { label: status, textClass: 'text-slate-600 dark:text-slate-400' };
  }
}

export function certStatusMeta(status: string, daysUntilExpiry?: number): { label: string; textClass: string } {
  if (status === 'renewed') {
    return { label: 'Renewed', textClass: 'text-emerald-600 dark:text-emerald-400' };
  }
  if (status === 'expired' || (daysUntilExpiry !== undefined && daysUntilExpiry < 0)) {
    const overdue = daysUntilExpiry !== undefined ? Math.abs(daysUntilExpiry) : 0;
    return {
      label: overdue > 0 ? `Expired ${overdue}d ago` : 'Expired',
      textClass: 'text-red-600 dark:text-red-400',
    };
  }
  if (status === 'expiring_today' || daysUntilExpiry === 0) {
    return { label: 'Expires today', textClass: 'text-amber-600 dark:text-amber-400' };
  }
  if (status === 'expiring_soon' || (daysUntilExpiry !== undefined && daysUntilExpiry <= 7)) {
    return {
      label: daysUntilExpiry !== undefined ? `Due in ${daysUntilExpiry}d` : 'Expiring soon',
      textClass: 'text-amber-600 dark:text-amber-400',
    };
  }
  return { label: 'Active', textClass: 'text-emerald-600 dark:text-emerald-400' };
}

export function todayIsoDate(): string {
  const istMs = Date.now() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).toISOString().slice(0, 10);
}

export function addDaysIsoDate(baseDate: string, days: number): string {
  const [y, m, d] = baseDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + days * 86400_000);
  return dt.toISOString().slice(0, 10);
}
