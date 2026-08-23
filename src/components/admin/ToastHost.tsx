import { useEffect, useState } from 'react';
import { TOAST_EVENT, type ToastDetail } from './toast';

interface Toast extends ToastDetail {
  id: number;
}

const TONE_STYLES: Record<ToastDetail['tone'], string> = {
  success: 'border-success-500/40 bg-success-500/12 text-success-500',
  error: 'border-error-500/40 bg-error-500/12 text-error-500',
};

const VISIBLE_MS = 4000;

export default function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 0;

    const handle = (event: Event) => {
      const { message, tone } = (event as CustomEvent<ToastDetail>).detail;
      const id = nextId++;

      setToasts((current) => [...current, { id, message, tone }]);
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
      }, VISIBLE_MS);
    };

    window.addEventListener(TOAST_EVENT, handle);
    return () => window.removeEventListener(TOAST_EVENT, handle);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-6 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`shadow-inner-dark w-full max-w-sm rounded-xl border px-4 py-3 text-sm font-semibold ${TONE_STYLES[toast.tone]}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
