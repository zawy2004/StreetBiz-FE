import { ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ visible, onClose, children }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const previous = document.activeElement as HTMLElement | null;
    const sheet = sheetRef.current;
    const controls = () =>
      Array.from(
        sheet?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    controls()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = controls();
      if (!items.length) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previous?.focus();
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,34,56,0.4)]"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className="relative flex flex-col gap-md rounded-t-md bg-card p-md shadow-sheet"
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
