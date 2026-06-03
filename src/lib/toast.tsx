import { useState, useEffect } from 'react';
import { CheckCircle, Info, X } from 'lucide-react';
import { sounds } from './sounds';

type ToastType = 'success' | 'info' | 'error';

interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface ToastEvent extends ToastOptions {
  id: number;
}

let toastIdGen = Date.now();
type Listener = (toast: ToastEvent) => void;
const listeners = new Set<Listener>();

export const toast = (message: string, type: ToastType = 'info', duration: number = 3000) => {
  const id = toastIdGen++;
  const event: ToastEvent = { id, message, type, duration };
  
  if (type === 'success') sounds.playSuccess();
  else if (type === 'info') sounds.playPop();

  listeners.forEach(listener => listener(event));
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastEvent[]>([]);

  useEffect(() => {
    const handleAdd = (t: ToastEvent) => {
      setToasts(prev => [...prev, t]);
      if (t.duration && t.duration > 0) {
        setTimeout(() => {
          setToasts(prev => prev.filter(item => item.id !== t.id));
        }, t.duration);
      }
    };

    listeners.add(handleAdd);
    return () => {
      listeners.delete(handleAdd);
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] flex flex-col items-center gap-2 pointer-events-none px-4">
      {toasts.map(t => (
        <div 
          key={t.id} 
          className="bg-neutral-900 border border-neutral-700 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in duration-300 pointer-events-auto"
        >
          {t.type === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
          {t.type === 'error' && <X className="w-5 h-5 text-red-500" />}
          <span className="font-medium text-sm">{t.message}</span>
        </div>
      ))}
    </div>
  );
}
