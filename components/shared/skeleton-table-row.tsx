import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonTableRowProps {
  columns?: number;
  className?: string;
}

export function SkeletonTableRow({
  columns = 5,
  className,
}: SkeletonTableRowProps) {
  return (
    <tr className={cn('animate-pulse border-b border-border/50', className)}>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-neutral-200 dark:bg-neutral-800" />
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800/60" />
          </div>
        </div>
      </td>
      {Array.from({ length: Math.max(1, columns - 1) }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div
            className="h-4 rounded bg-neutral-200 dark:bg-neutral-800"
            style={{ width: `${Math.floor(40 + (i * 20) % 50)}%` }}
          />
        </td>
      ))}
    </tr>
  );
}
