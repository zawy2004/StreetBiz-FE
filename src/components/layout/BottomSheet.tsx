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
    <div className="fixed inset-0 z-50 flex flex-col justify-end lg:items-center lg:justify-center lg:p-lg">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-[rgb(var(--scrim)/0.5)] backdrop-blur-[2px]"
      />
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        className="cq relative flex max-h-[90vh] flex-col gap-md overflow-y-auto rounded-t-lg border border-border bg-card p-md pb-lg shadow-sheet lg:w-full lg:max-w-[560px] lg:rounded-lg lg:p-lg"
      >
        <div className="mx-auto h-1 w-10 shrink-0 rounded-full bg-border lg:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
