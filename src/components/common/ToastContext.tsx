import { createContext, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import './Toast.css';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    counter.current += 1;
    const id = `t-${counter.current}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  // PUNTO 4: íconos SVG en vez de emojis
  const iconos: Record<ToastType, string> = {
    success: '✓',
    error:   '✕',
    warning: '!',
    info:    'i',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="toast-container" role="region" aria-label="Notificaciones" aria-live="polite">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast--${toast.type}`} role="alert">
            <span className="toast__icon" aria-hidden="true">
              {iconos[toast.type]}
            </span>
            <span className="toast__message">{toast.message}</span>
            <button className="toast__close" onClick={() => removeToast(toast.id)} aria-label="Cerrar">✕</button>
            <div className="toast__progress" style={{ animationDuration: `${toast.duration}ms` }} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
