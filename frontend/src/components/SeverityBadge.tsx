import React from 'react';
import { SeverityLevel } from '../types';

interface Props {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<Props> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'Informational') as SeverityLevel;

  const styleMap: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
    Critical: { bg: 'bg-red-950/40', text: 'text-red-400', border: 'border-red-800/60' },
    High: { bg: 'bg-orange-950/40', text: 'text-orange-400', border: 'border-orange-800/60' },
    Medium: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-800/60' },
    Low: { bg: 'bg-blue-950/40', text: 'text-blue-400', border: 'border-blue-800/60' },
    Informational: { bg: 'bg-slate-900/60', text: 'text-slate-400', border: 'border-slate-700/60' },
  };

  const style = styleMap[sev] || styleMap.Informational;

  const sizeClass = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm font-semibold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${style.bg} ${style.text} ${style.border} ${sizeClass}`}
    >
      <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-80" />
      {sev}
    </span>
  );
};
