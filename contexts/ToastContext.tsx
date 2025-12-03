import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage, ToastType } from '../types';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

interface ToastContextType {
  addToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string, duration: number = 5000) => {
    const id = Date.now().toString() + Math.random().toString();
    const newToast: ToastMessage = { id, message, type, title, duration };
    
    setToasts((prev) => [newToast, ...prev].slice(0, 5)); // Limit to 5 toasts at once

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={24} />;
      case 'error': return <AlertCircle className="text-red-500" size={24} />;
      case 'warning': return <AlertTriangle className="text-amber-500" size={24} />;
      case 'info': return <Info className="text-blue-500" size={24} />;
    }
  };

  const getStyles = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-green-500 bg-green-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'warning': return 'border-amber-500 bg-amber-50';
      case 'info': return 'border-blue-500 bg-blue-50';
    }
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      
      {/* Toast Container - Fixed Position */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-xl border-r-4 transition-all duration-300 animate-fade-in-down ${getStyles(toast.type)} bg-white`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {getIcon(toast.type)}
            </div>
            <div className="flex-1">
              {toast.title && <h4 className="font-bold text-gray-900 text-sm mb-0.5">{toast.title}</h4>}
              <p className="text-sm text-gray-700 leading-tight font-medium">{toast.message}</p>
            </div>
            <button 
              onClick={() => removeToast(toast.id)}
              className="text-gray-400 hover:text-gray-600 transition p-1"
            >
              <X size={18} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};