import React from 'react';

interface GlobalLoaderProps {
  fullScreen?: boolean;
  label?: string;
}

export function GlobalLoader({ fullScreen = true, label }: GlobalLoaderProps) {
  return (
    <div
      className={
        fullScreen
          ? 'min-h-screen w-full bg-zinc-50 dark:bg-black flex flex-col items-center justify-center gap-3 p-4'
          : 'min-h-[280px] w-full flex flex-col items-center justify-center gap-3 p-6'
      }
      role="status"
      aria-live="polite"
    >
      <svg
        className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-500"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle
          className="stroke-zinc-200 dark:stroke-zinc-800"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="2.75"
        />
        <path
          className="stroke-current"
          d="M12 2a10 10 0 0 1 10 10"
          strokeWidth="2.75"
          strokeLinecap="round"
        />
      </svg>
      {label && (
        <span className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
      )}
    </div>
  );
}
