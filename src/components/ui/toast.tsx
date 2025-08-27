'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  showToast: (type: ToastType, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: ToastType, title: string, message?: string) => {
    const id = Date.now().toString();
    const newToast: Toast = { id, type, title, message };
    
    setToasts(prev => [...prev, newToast]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'flex items-start gap-3 p-4 rounded-md shadow-lg border max-w-sm',
              'animate-in slide-in-from-right-full duration-300',
              {
                'bg-green-50 border-green-200 text-green-800': toast.type === 'success',
                'bg-red-50 border-red-200 text-red-800': toast.type === 'error',
                'bg-blue-50 border-blue-200 text-blue-800': toast.type === 'info',
              }
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === 'success' && (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {toast.type === 'info' && (
                <Info className="h-5 w-5 text-blue-600" />
              )}
            </div>
            
            <div className="flex-1">
              <p className="font-medium text-sm">{toast.title}</p>
              {toast.message && (
                <p className="text-sm mt-1 opacity-90">{toast.message}</p>
              )}
            </div>
            
            <button
              onClick={() => removeToast(toast.id)}
              className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}