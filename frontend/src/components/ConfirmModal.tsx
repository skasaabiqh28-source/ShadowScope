import React, { useEffect, useRef } from 'react';
import { Terminal, AlertTriangle } from 'lucide-react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<Props> = ({
  isOpen,
  title,
  message,
  confirmText = 'Y: CONFIRM',
  cancelText = 'N: ABORT',
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key.toLowerCase() === 'n') {
          onCancel();
        } else if (e.key.toLowerCase() === 'y') {
          onConfirm();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      confirmBtnRef.current?.focus();
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onCancel, onConfirm]);

  if (!isOpen) return null;

  const borderColor = isDanger ? 'border-[#ff3333]' : 'border-[#ffb000]';
  const textColor = isDanger ? 'text-[#ff3333]' : 'text-[#ffb000]';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className={`bg-black border-2 ${borderColor} max-w-md w-full font-mono text-xs shadow-[0_0_20px_rgba(0,0,0,0.9)]`}>
        {/* Header Bar */}
        <div className={`flex items-center justify-between px-3 py-1.5 border-b ${borderColor} bg-[#0a0a0a]`}>
          <div className="flex items-center space-x-2">
            <Terminal className={`w-3.5 h-3.5 ${textColor}`} />
            <span className={`font-bold tracking-wider uppercase ${textColor}`}>
              :: [SYS_PROMPT: CONFIRM_ACTION] ::
            </span>
          </div>
          <button
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-[#94a3b8] hover:text-[#ff3333] transition-colors"
          >
            [&times;]
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className={`w-5 h-5 shrink-0 ${textColor} mt-0.5`} />
            <div>
              <h3 id="confirm-modal-title" className={`text-sm font-bold uppercase ${textColor}`}>
                {title}
              </h3>
              <p className="text-xs text-[#94a3b8] mt-1.5 leading-relaxed font-mono">
                {message}
              </p>
            </div>
          </div>

          <div className="bg-[#050c05] p-2 border border-[#1f521f] text-[11px] text-[#33ff00]">
            <span className="text-[#94a3b8]">HOTKEYS: </span>
            Press <kbd className="text-[#33ff00] font-bold">[Y]</kbd> to confirm, <kbd className="text-[#ff3333] font-bold">[N]</kbd> or <kbd className="text-[#94a3b8]">[ESC]</kbd> to abort.
          </div>
        </div>

        {/* Action Buttons */}
        <div className={`flex items-center justify-end space-x-3 px-4 py-2.5 border-t ${borderColor} bg-[#0a0a0a]`}>
          <button
            type="button"
            onClick={onCancel}
            className="btn-terminal"
          >
            [{cancelText}]
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            className={isDanger ? 'btn-terminal-danger' : 'btn-terminal-amber'}
          >
            [{confirmText}]
          </button>
        </div>
      </div>
    </div>
  );
};
