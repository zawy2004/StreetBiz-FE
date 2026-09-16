import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { create } from 'zustand';

type ToastState = {
  message: string | null;
  show: (message: string) => void;
  hide: () => void;
};

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  hide: () => set({ message: null }),
}));

export function showToast(message: string) {
  useToastStore.getState().show(message);
}

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2200);
    return () => clearTimeout(t);
  }, [message, hide]);

  if (!message) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-xl z-50 flex justify-center">
      <div className="max-w-[90%] rounded-sm bg-indigo px-md py-sm text-body-md text-white shadow-sheet">
        {message}
      </div>
    </div>,
    document.body,
  );
}
