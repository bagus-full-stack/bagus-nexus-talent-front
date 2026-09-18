import React from 'react';
import { cn } from '@/lib/utils';

export interface ScoreBadgeProps {
  value: number; // 0 to 100
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ScoreBadge({
  value,
  size = 'md',
  showLabel = false,
  className,
}: ScoreBadgeProps) {
  const clampedValue = Math.min(100, Math.max(0, Math.round(value)));

  // Determination de la palette selon le score
  // vert > 80%, orange 50-80%, gris/rouge < 50%
  let strokeColor = '#0D9468'; // Emerald
  let textColor = 'text-emerald-700 dark:text-emerald-400';
  let label = 'MATCH FORT';

  if (clampedValue < 50) {
    strokeColor = '#94A3B8'; // Slate/Muted Grey
    textColor = 'text-slate-600 dark:text-slate-400';
    label = 'ÉCART DE STACK';
  } else if (clampedValue <= 80) {
    strokeColor = '#D97706'; // Amber Ochre
    textColor = 'text-amber-700 dark:text-amber-400';
    label = 'PERTINENT';
  }

  // Dimensions selon size
  const dimensions = {
    sm: { size: 36, stroke: 3, font: 'text-xs font-bold' },
    md: { size: 48, stroke: 3.5, font: 'text-sm font-bold' },
    lg: { size: 64, stroke: 4.5, font: 'text-lg font-bold' },
  }[size];

  const radius = (dimensions.size - dimensions.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={cn('inline-flex flex-col items-center justify-center gap-1', className)}>
      <div
        className="relative flex items-center justify-center"
        style={{ width: dimensions.size, height: dimensions.size }}
      >
        <svg
          width={dimensions.size}
          height={dimensions.size}
          className="rotate-[-90deg]"
        >
          {/* Track background */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={dimensions.stroke}
            className="text-neutral-200 dark:text-neutral-800"
          />
          {/* Progress stroke */}
          <circle
            cx={dimensions.size / 2}
            cy={dimensions.size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={dimensions.stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        </svg>

        {/* Valeur textuelle centrée */}
        <span
          className={cn(
            'absolute font-sans font-bold tabular-nums',
            dimensions.font,
            textColor
          )}
        >
          {clampedValue}%
        </span>
      </div>

      {showLabel && (
        <span className="text-[10px] font-semibold tracking-wider uppercase text-neutral-500 dark:text-neutral-400">
          {label}
        </span>
      )}
    </div>
  );
}
