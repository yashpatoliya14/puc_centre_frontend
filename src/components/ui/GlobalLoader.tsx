import React from 'react';

interface GlobalLoaderProps {
  fullScreen?: boolean;
  label?: string;
}

export function GlobalLoader({ fullScreen = true, label = 'Loading...' }: GlobalLoaderProps) {
  return (
    <div
      className={
        fullScreen
          ? 'min-h-screen w-full bg-zinc-50 dark:bg-black flex items-center justify-center p-4'
          : 'min-h-[320px] w-full flex items-center justify-center p-6'
      }
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3.5 px-7 py-6 rounded-2xl bg-white dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 shadow-lg">
        <div className="relative h-11 w-11 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-[3px] border-blue-100 dark:border-blue-950 border-t-blue-600 dark:border-t-blue-400 animate-spin" />
          <div className="h-2.5 w-2.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
        </div>
        <span className="text-xs font-semibold tracking-wide text-zinc-700 dark:text-zinc-200">
          {label}
        </span>
      </div>
    </div>
  );
}
