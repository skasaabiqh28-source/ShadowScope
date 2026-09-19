import React from 'react';
import { LucideIcon, Terminal } from 'lucide-react';

interface Props {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<Props> = ({
  icon: Icon = Terminal,
  title,
  description,
  actionText,
  actionLabel,
  onAction,
  className = '',
}) => {
  const label = actionText || actionLabel;

  return (
    <div className={`p-8 text-center font-mono flex flex-col items-center justify-center space-y-3 border border-dashed border-[#1f521f] bg-black ${className}`}>
      <div className="w-10 h-10 border border-[#1f521f] flex items-center justify-center text-[#33ff00] bg-[#050c05]">
        <Icon className="w-5 h-5 text-[#33ff00]" />
      </div>
      <div className="text-xs text-[#33ff00] font-bold uppercase tracking-wider">
        &gt; {title}
      </div>
      <p className="text-[11px] text-[#94a3b8] max-w-sm leading-relaxed">
        {description}
      </p>
      {label && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="btn-terminal mt-2"
        >
          [+ {label.toUpperCase()}]
        </button>
      )}
    </div>
  );
};
