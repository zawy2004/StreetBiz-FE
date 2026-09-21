import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useToastStore } from './toast-store';

export function ToastHost() {
  const message = useToastStore((s) => s.message);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(hide, 2600);
    return () => clearTimeout(t);
  }, [message, hide]);

  if (!message) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[88px] z-[60] flex justify-center px-md lg:bottom-lg"
    >
      <div className="max-w-[480px] rounded-md bg-text px-md py-sm text-body-md font-medium text-bg shadow-sheet">
        {message}
      </div>
    </div>,
    document.body,
  );
}
