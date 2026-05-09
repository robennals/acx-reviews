'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';

type ToastKind = 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

interface ToastContextValue {
  show: (message: string, kind?: ToastKind) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const TIMEOUT_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, kind: ToastKind = 'info') => {
      const id = nextId.current++;
      setToasts((ts) => [...ts, { id, message, kind }]);
      setTimeout(() => dismiss(id), TIMEOUT_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none"
          role="status"
          aria-live="polite"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`pointer-events-auto px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 ${
                t.kind === 'error'
                  ? 'bg-red-50 border-red-300 text-red-900 dark:bg-red-950/60 dark:border-red-800 dark:text-red-100'
                  : 'bg-card border-border text-foreground'
              }`}
            >
              <span className="flex-1 text-sm leading-relaxed">{t.message}</span>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="text-current opacity-60 hover:opacity-100 text-lg leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
