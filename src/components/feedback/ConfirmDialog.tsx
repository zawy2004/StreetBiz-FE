import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/common';
import type { ButtonVariant } from '@/components/common/Button';

type Props = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmVariant?: ButtonVariant;
  /** Extra content between the description and the buttons (e.g. a required reason field). */
  children?: ReactNode;
  confirmDisabled?: boolean;
  /** The confirm request is in flight: the button spins and cannot be pressed twice. */
  busy?: boolean;
  /** A failed confirm: shown in place so the dialog stays open and the input is kept. */
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = 'Xác nhận',
  confirmVariant = 'primary',
  children,
  confirmDisabled,
  busy,
  error,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgb(var(--scrim)/0.5)] p-md backdrop-blur-[2px]">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="sb-pop w-full max-w-[440px] overflow-hidden rounded-[28px] bg-card shadow-sheet ring-1 ring-border"
      >
        <div aria-hidden="true" className="sb-kerb sb-kerb-thin" />
        <div className="p-lg">
          <h2
            id="confirm-dialog-title"
            className="font-heading text-[21px] font-bold leading-tight text-text"
          >
            {title}
          </h2>
          {description ? <p className="mt-xs text-body-md text-muted">{description}</p> : null}
          {children ? <div className="mt-md">{children}</div> : null}
          {error ? (
            <p role="alert" className="mt-sm text-body-sm font-medium text-error">
              {error}
            </p>
          ) : null}
          <div className="mt-lg flex flex-col-reverse gap-sm sm:flex-row sm:justify-end">
            <Button label="Huỷ" variant="outline" fullWidth={false} onPress={onCancel} />
            <Button
              label={confirmLabel}
              variant={confirmVariant}
              fullWidth={false}
              disabled={confirmDisabled}
              loading={busy}
              onPress={onConfirm}
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
