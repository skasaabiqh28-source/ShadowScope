import React from 'react';

export const SkeletonCard: React.FC<{ rows?: number; height?: string; className?: string }> = ({
  rows = 3,
  height,
  className = '',
}) => {
  return (
    <div
      className={`bg-[#111726] border border-[#1d273a] p-5 rounded-xl animate-pulse space-y-3 ${
        height || ''
      } ${className}`}
    >
      <div className="h-4 bg-[#1b2538] rounded w-1/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-3 bg-[#151c2a] rounded"
          style={{ width: `${85 - i * 15}%` }}
        />
      ))}
    </div>
  );
};

export const SkeletonTable: React.FC<{ rows?: number; columns?: number; cols?: number }> = ({
  rows = 5,
  columns = 5,
  cols,
}) => {
  const colCount = cols ?? columns;
  return (
    <div className="bg-[#111726] border border-[#1d273a] rounded-xl overflow-hidden p-4 space-y-3 animate-pulse">
      <div className="flex justify-between items-center mb-4">
        <div className="h-4 bg-[#1b2538] rounded w-1/4" />
        <div className="h-4 bg-[#1b2538] rounded w-20" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div
            key={rIdx}
            className="grid gap-4 py-2 border-b border-[#162030]"
            style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: colCount }).map((_, cIdx) => (
              <div key={cIdx} className="h-3 bg-[#151c2a] rounded w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SkeletonMetrics: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-[#111726] border border-[#1d273a] p-4 rounded-lg animate-pulse space-y-2">
          <div className="h-3 bg-[#1b2538] rounded w-2/3" />
          <div className="h-7 bg-[#1e293b] rounded w-1/2" />
          <div className="h-2 bg-[#151c2a] rounded w-4/5" />
        </div>
      ))}
    </div>
  );
};
