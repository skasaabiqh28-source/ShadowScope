import React from 'react';

interface AsciiBarProps {
  value: number;
  max?: number;
  length?: number;
  label?: string;
  filledChar?: string;
  emptyChar?: string;
  variant?: 'green' | 'amber' | 'red' | 'muted';
  showPercent?: boolean;
  showValue?: boolean;
  className?: string;
}

export const AsciiBar: React.FC<AsciiBarProps> = ({
  value,
  max = 100,
  length = 20,
  label,
  filledChar = '█',
  emptyChar = '░',
  variant = 'green',
  showPercent = true,
  showValue = false,
  className = '',
}) => {
  const safeMax = max > 0 ? max : 1;
  const ratio = Math.max(0, Math.min(1, value / safeMax));
  const filledCount = Math.round(ratio * length);
  const emptyCount = Math.max(0, length - filledCount);

  const filledStr = filledChar.repeat(filledCount);
  const emptyStr = emptyChar.repeat(emptyCount);
  const percentage = Math.round(ratio * 100);

  const colorClasses = {
    green: 'text-[#33ff00]',
    amber: 'text-[#ffb000]',
    red: 'text-[#ff3333]',
    muted: 'text-[#1f521f]',
  };

  const activeColor = colorClasses[variant] || colorClasses.green;

  return (
    <div className={`font-mono text-xs flex items-center space-x-2 select-none ${className}`}>
      {label && <span className="text-[#94a3b8] uppercase min-w-[80px] text-[11px]">{label}</span>}
      <div className="flex items-center">
        <span className="text-[#1f521f]">[</span>
        <span className={`${activeColor} tracking-tighter`}>{filledStr}</span>
        <span className="text-[#1f521f] tracking-tighter">{emptyStr}</span>
        <span className="text-[#1f521f]">]</span>
      </div>
      {showPercent && (
        <span className={`${activeColor} min-w-[36px] text-right font-bold text-[11px]`}>
          {percentage}%
        </span>
      )}
      {showValue && (
        <span className="text-[#94a3b8] text-[10px]">
          ({value}/{max})
        </span>
      )}
    </div>
  );
};

export default AsciiBar;
