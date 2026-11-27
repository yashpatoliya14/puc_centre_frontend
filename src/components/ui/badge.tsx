import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-blue-600 text-white shadow-xs hover:bg-blue-700',
        secondary:
          'border-transparent bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200',
        destructive:
          'border-red-200 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
        outline:
          'border-zinc-300 text-zinc-800 dark:border-zinc-700 dark:text-zinc-200',
        success:
          'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
        warning:
          'border-zinc-300 bg-zinc-100 text-zinc-900 dark:bg-zinc-900 dark:text-zinc-200 dark:border-zinc-700',
        info:
          'border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
