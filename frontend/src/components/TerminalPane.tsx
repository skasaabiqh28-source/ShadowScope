import React from 'react';

interface TerminalPaneProps {
  title?: string;
  badge?: React.ReactNode;
  controls?: boolean;
  amber?: boolean;
  error?: boolean;
  glow?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  prefix?: string;
}

export const TerminalPane: React.FC<TerminalPaneProps> = ({
  title,
  badge,
  controls = true,
  amber = false,
  error = false,
  glow = false,
  headerAction,
  children,
  className = '',
  footer,
  prefix = 'SYS',
}) => {
  const borderColor = error
    ? 'border-[#ff3333]'
    : amber
    ? 'border-[#ffb000]'
    : 'border-[#1f521f]';

  const headerBorder = error
    ? 'border-[#ff3333]'
    : amber
    ? 'border-[#ffb000]'
    : 'border-[#1f521f]';

  const titleColor = error
    ? 'text-[#ff3333]'
    : amber
    ? 'text-[#ffb000]'
    : 'text-[#33ff00]';

  const glowClass = glow
    ? error
      ? 'shadow-[0_0_10px_rgba(255,51,51,0.25)]'
      : amber
      ? 'shadow-[0_0_10px_rgba(255,176,0,0.25)]'
      : 'shadow-[0_0_10px_rgba(51,255,0,0.2)]'
    : '';

  return (
    <div
      className={`bg-black border ${borderColor} ${glowClass} flex flex-col ${className}`}
    >
      {/* Terminal Title Bar */}
      {title && (
        <div
          className={`flex items-center justify-between px-3 py-1.5 border-b ${headerBorder} bg-[#0a0a0a] text-xs font-mono select-none`}
        >
          <div className="flex items-center space-x-2 overflow-hidden">
            <span className="text-[#1f521f] font-bold">::</span>
            <span className={`font-bold tracking-wider uppercase ${titleColor}`}>
              [{prefix}: {title}]
            </span>
            {badge && <div>{badge}</div>}
          </div>

          <div className="flex items-center space-x-3 ml-2 shrink-0">
            {headerAction && <div>{headerAction}</div>}
            {controls && (
              <div className="hidden sm:flex items-center space-x-1 text-[#1f521f] font-mono text-[10px]">
                <span className="hover:text-[#33ff00] cursor-pointer">[&minus;]</span>
                <span className="hover:text-[#33ff00] cursor-pointer">[&square;]</span>
                <span className="hover:text-[#ff3333] cursor-pointer">[&times;]</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pane Content */}
      <div className="p-3 sm:p-4 flex-1">{children}</div>

      {/* Optional Pane Footer */}
      {footer && (
        <div className={`px-3 py-1 border-t ${headerBorder} bg-[#050c05] text-[11px] text-[#1f521f] font-mono flex items-center justify-between`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default TerminalPane;
