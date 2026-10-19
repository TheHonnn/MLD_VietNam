import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  message?: string;
  type: ToastType;
  duration?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

let toastList: ToastItem[] = [];
const listeners = new Set<ToastListener>();

const notifyListeners = () => {
  listeners.forEach((listener) => listener([...toastList]));
};

export const toast = {
  show: (
    title: string,
    options?: { message?: string; type?: ToastType; duration?: number }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast: ToastItem = {
      id,
      title,
      message: options?.message,
      type: options?.type || 'info',
      duration: options?.duration ?? 4000,
    };
    // Keep max 5 visible toasts at a time
    toastList = [newToast, ...toastList].slice(0, 5);
    notifyListeners();

    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        toast.dismiss(id);
      }, newToast.duration);
    }
    return id;
  },

  success: (title: string, message?: string, duration = 4000) => {
    return toast.show(title, { message, type: 'success', duration });
  },

  error: (title: string, message?: string, duration = 5000) => {
    return toast.show(title, { message, type: 'error', duration });
  },

  info: (title: string, message?: string, duration = 4000) => {
    return toast.show(title, { message, type: 'info', duration });
  },

  warning: (title: string, message?: string, duration = 4500) => {
    return toast.show(title, { message, type: 'warning', duration });
  },

  dismiss: (id: string) => {
    toastList = toastList.filter((t) => t.id !== id);
    notifyListeners();
  },

  clearAll: () => {
    toastList = [];
    notifyListeners();
  },
};

const toastConfig: Record<
  ToastType,
  {
    icon: React.FC<{ className?: string }>;
    accentColor: string;
    iconBg: string;
    iconColor: string;
    borderColor: string;
    barColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    accentColor: '#0D6832',
    iconBg: 'bg-[#E8F6ED]',
    iconColor: 'text-[#0D6832]',
    borderColor: 'border-[#C2E8D1]',
    barColor: 'bg-[#12B76A]',
  },
  error: {
    icon: AlertCircle,
    accentColor: '#B42318',
    iconBg: 'bg-[#FEF3F2]',
    iconColor: 'text-[#B42318]',
    borderColor: 'border-[#FECDCA]',
    barColor: 'bg-[#F04438]',
  },
  warning: {
    icon: AlertTriangle,
    accentColor: '#B54708',
    iconBg: 'bg-[#FFFAEB]',
    iconColor: 'text-[#B54708]',
    borderColor: 'border-[#FEDF89]',
    barColor: 'bg-[#F79009]',
  },
  info: {
    icon: Info,
    accentColor: '#8A4F23',
    iconBg: 'bg-[#F3E2CE]',
    iconColor: 'text-[#8A4F23]',
    borderColor: 'border-[#EFE4D9]',
    barColor: 'bg-[#8A4F23]',
  },
};

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleUpdate = (updated: ToastItem[]) => {
      setToasts(updated);
    };
    listeners.add(handleUpdate);
    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-[380px] w-full pointer-events-none font-['Plus_Jakarta_Sans',sans-serif]"
    >
      {toasts.map((item) => {
        const config = toastConfig[item.type];
        const IconComponent = config.icon;

        return (
          <div
            key={item.id}
            role="alert"
            className={`pointer-events-auto relative overflow-hidden bg-white/95 backdrop-blur-md rounded-2xl border ${config.borderColor} shadow-2xl p-3.5 flex items-start gap-3 transition-all duration-200 animate-in slide-in-from-top-3 fade-in`}
          >
            {/* Type Icon */}
            <div
              className={`w-9 h-9 rounded-xl ${config.iconBg} ${config.iconColor} flex items-center justify-center shrink-0 mt-0.5 shadow-xs`}
            >
              <IconComponent className="w-5 h-5 stroke-[2]" />
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-xs font-bold text-[#2C241E] leading-snug">
                {item.title}
              </h4>
              {item.message && (
                <p className="text-[11.5px] text-[#73675F] mt-0.5 leading-relaxed font-medium">
                  {item.message}
                </p>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              type="button"
              onClick={() => toast.dismiss(item.id)}
              className="text-[#A69788] hover:text-[#2C241E] p-1 rounded-lg hover:bg-[#F8F1E8] transition-colors cursor-pointer shrink-0"
              title="Đóng thông báo"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Animated Progress Bar */}
            {item.duration && item.duration > 0 && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-[2.5px] ${config.barColor} opacity-75 origin-left animate-out`}
                style={{
                  animationDuration: `${item.duration}ms`,
                  animationTimingFunction: 'linear',
                  animationName: 'toast-shrink',
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
