import React from 'react';

interface Props {
  status: string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const norm = (status || 'Unknown').toLowerCase();

  let colorClasses = 'bg-slate-800 text-slate-300 border-slate-700';
  let pulse = false;

  if (norm === 'completed' || norm === 'fixed' || norm === 'resolved') {
    colorClasses = 'bg-emerald-950/40 text-emerald-400 border-emerald-800/60';
  } else if (norm === 'running' || norm === 'starting') {
    colorClasses = 'bg-blue-950/40 text-blue-400 border-blue-800/60';
    pulse = true;
  } else if (norm === 'failed') {
    colorClasses = 'bg-red-950/40 text-red-400 border-red-800/60';
  } else if (norm === 'cancelled' || norm === 'accepted risk') {
    colorClasses = 'bg-slate-900 text-slate-400 border-slate-700';
  } else if (norm === 'open' || norm === 'retest required' || norm === 'confirmed') {
    colorClasses = 'bg-amber-950/40 text-amber-400 border-amber-800/60';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses}`}
    >
      {pulse && (
        <span className="relative flex h-2 w-2 mr-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
        </span>
      )}
      {!pulse && <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-current opacity-70" />}
      {status}
    </span>
  );
};
