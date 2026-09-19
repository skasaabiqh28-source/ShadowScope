import React from 'react';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const norm = (status || 'Unknown').toLowerCase();

  let borderClass = 'border-[#1f521f] text-[#94a3b8] bg-black';
  let prefix = 'SYS';
  let isRunning = false;

  if (norm === 'completed' || norm === 'fixed' || norm === 'resolved') {
    borderClass = 'border-[#33ff00] text-[#33ff00] bg-[#33ff00]/10';
    prefix = 'OK';
  } else if (norm === 'running' || norm === 'starting' || norm === 'in progress') {
    borderClass = 'border-[#33ff00] text-[#33ff00] bg-black animate-pulse';
    prefix = 'RUN';
    isRunning = true;
  } else if (norm === 'failed') {
    borderClass = 'border-[#ff3333] text-[#ff3333] bg-[#ff3333]/10';
    prefix = 'ERR';
  } else if (norm === 'cancelled' || norm === 'aborted') {
    borderClass = 'border-[#ffb000] text-[#ffb000] bg-black';
    prefix = 'ABRT';
  } else if (norm === 'open' || norm === 'retest required' || norm === 'confirmed') {
    borderClass = 'border-[#ffb000] text-[#ffb000] bg-[#ffb000]/10';
    prefix = 'ALERT';
  }

  return (
    <span
      className={`inline-flex items-center font-mono text-[11px] px-2 py-0.5 border ${borderClass} tracking-wider uppercase select-none`}
    >
      <span className="opacity-60 mr-1">[</span>
      <span className="font-bold mr-1">{prefix}:</span>
      <span>{status}</span>
      {isRunning && <span className="inline-block w-1.5 h-3 ml-1.5 bg-[#33ff00] animate-blink" />}
      <span className="opacity-60 ml-1">]</span>
    </span>
  );
};
