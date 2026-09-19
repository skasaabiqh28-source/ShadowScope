import React, { createContext, useContext, useState, useCallback } from 'react';
import { Terminal, AlertTriangle, AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  addToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, addToast: showToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none font-mono text-xs select-none"
      >
        {toasts.map((t) => {
          let border = 'border-[#1f521f] text-[#33ff00]';
          let prefix = 'SYS_INFO';

          if (t.type === 'success') {
            border = 'border-[#33ff00] text-[#33ff00] shadow-[0_0_10px_rgba(51,255,0,0.3)]';
            prefix = 'SYS_OK';
          } else if (t.type === 'error') {
            border = 'border-[#ff3333] text-[#ff3333] shadow-[0_0_10px_rgba(255,51,51,0.3)]';
            prefix = 'SYS_ERR';
          } else if (t.type === 'warning') {
            border = 'border-[#ffb000] text-[#ffb000] shadow-[0_0_10px_rgba(255,176,0,0.3)]';
            prefix = 'SYS_WARN';
          }

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto bg-black border-2 p-3 flex items-start justify-between gap-2 text-xs leading-relaxed ${border}`}
            >
              <div className="space-y-0.5">
                <div className="text-[10px] opacity-80 font-bold uppercase">
                  :: [{prefix}] ::
                </div>
                <div className="font-mono text-xs">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                aria-label="Close notification"
                className="opacity-70 hover:opacity-100 hover:text-white transition-opacity font-bold ml-2"
              >
                [&times;]
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
};
