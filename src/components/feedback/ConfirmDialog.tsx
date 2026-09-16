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
  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(26,34,56,0.4)] p-lg">
      <div className="w-full max-w-[400px] rounded-md bg-card p-md shadow-sheet">
        <h2 className="text-headline-md text-text">{title}</h2>
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
