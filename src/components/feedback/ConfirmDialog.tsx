import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/common';
import type { ButtonVariant } from '@/components/common/Button';

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = 'Xác nhận',
  confirmVariant = 'primary',
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible) return;
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    const controls = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    controls()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
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
  }, [visible, onCancel]);

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,34,56,0.4)] p-lg">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-[400px] rounded-md bg-card p-md shadow-sheet"
      >
        <h2 id="confirm-dialog-title" className="text-headline-md text-text">{title}</h2>
        {description ? <p className="mt-2xs text-body-md text-muted">{description}</p> : null}
        <div className="mt-md flex gap-sm">
          <div className="flex-1">
            <Button label="Huỷ" variant="outline" onPress={onCancel} />
          </div>
          <div className="flex-1">
            <Button label={confirmLabel} variant={confirmVariant} onPress={onConfirm} />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
