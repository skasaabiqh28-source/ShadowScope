import React from 'react';
import { SeverityLevel } from '../types';

interface Props {
  severity: SeverityLevel | string;
  size?: 'sm' | 'md' | 'lg';
}

export const SeverityBadge: React.FC<Props> = ({ severity, size = 'md' }) => {
  const sev = (severity || 'Informational') as SeverityLevel;

  const styleMap: Record<SeverityLevel, { text: string; border: string; bg: string }> = {
    Critical: { text: 'text-[#ff3333]', border: 'border-[#ff3333]', bg: 'bg-[#ff3333]/10' },
    High: { text: 'text-[#ffb000]', border: 'border-[#ffb000]', bg: 'bg-[#ffb000]/10' },
    Medium: { text: 'text-[#ffb000]', border: 'border-[#ffb000]/60', bg: 'bg-[#ffb000]/5' },
    Low: { text: 'text-[#33ff00]', border: 'border-[#33ff00]/60', bg: 'bg-[#33ff00]/5' },
    Informational: { text: 'text-[#94a3b8]', border: 'border-[#1f521f]', bg: 'bg-black' },
  };

  const style = styleMap[sev] || styleMap.Informational;

  const sizeClass = {
    sm: 'px-1.5 py-0.2 text-[10px]',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm font-bold',
  }[size];

  return (
    <span
      className={`inline-flex items-center font-mono tracking-wider uppercase border ${style.border} ${style.bg} ${style.text} ${sizeClass} select-none`}
    >
      <span className="opacity-60 mr-1">[</span>
      <span className="font-bold">{sev}</span>
      <span className="opacity-60 ml-1">]</span>
    </span>
  );
};
