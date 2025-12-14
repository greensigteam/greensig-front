import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

/**
 * ToastContext - Global toast notification system
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Auto-dismiss with configurable duration
 * - Manual dismiss
 * - Stacked toasts (max 5 visible)
 * - Smooth animations
 *
 * Usage:
 * const { showToast } = useToast();
 * showToast('Success!', 'success');
 */

// ========== TYPES ==========

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  dismissToast: (id: string) => void;
}

// ========== CONTEXT ==========

const ToastContext = createContext<ToastContextValue | null>(null);

// ========== PROVIDER ==========

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((
    message: string,
    type: ToastType = 'info',
    duration: number = 5000
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const newToast: Toast = {
      id,
      message,
      type,
      duration
    };

    setToasts(prev => {
      // Limit to maxToasts
      const updated = [...prev, newToast];
      return updated.slice(-maxToasts);
    });

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, duration);
    }
  }, [maxToasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const value: ToastContextValue = {
    toasts,
    showToast,
    dismissToast
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

// ========== TOAST CONTAINER ==========

interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

// ========== TOAST ITEM ==========

interface ToastItemProps {
  toast: Toast;
  onDismiss: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const config = {
    success: {
      icon: CheckCircle,
      bgClass: 'bg-emerald-50 border-emerald-200',
      iconClass: 'text-emerald-600',
      textClass: 'text-emerald-800'
    },
    error: {
      icon: XCircle,
      bgClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-600',
      textClass: 'text-red-800'
    },
    warning: {
      icon: AlertCircle,
      bgClass: 'bg-orange-50 border-orange-200',
      iconClass: 'text-orange-600',
      textClass: 'text-orange-800'
    },
    info: {
      icon: Info,
      bgClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-600',
      textClass: 'text-blue-800'
    }
  };

  const { icon: Icon, bgClass, iconClass, textClass } = config[toast.type];

  return (
    <div
      className={`
        ${bgClass}
        border rounded-lg shadow-lg p-4
        min-w-[320px] max-w-md
        flex items-start gap-3
        pointer-events-auto
        animate-in slide-in-from-right-5 fade-in duration-300
      `}
    >
      <Icon className={`w-5 h-5 ${iconClass} shrink-0 mt-0.5`} />
      <p className={`text-sm font-medium ${textClass} flex-1`}>
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className={`${textClass} hover:opacity-70 transition-opacity shrink-0`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// ========== HOOK ==========

/**
 * Custom hook to access Toast functionality
 *
 * @throws Error if used outside ToastProvider
 *
 * @example
 * const { showToast } = useToast();
 *
 * // Success toast
 * showToast('Opération réussie!', 'success');
 *
 * // Error toast with custom duration
 * showToast('Erreur lors du chargement', 'error', 8000);
 */
export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
};

// ========== EXPORTS ==========

export type { ToastContextValue };
