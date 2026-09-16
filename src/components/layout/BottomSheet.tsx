import { ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function BottomSheet({ visible, onClose, children }: Props) {
  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Đóng"
        onClick={onClose}
        className="absolute inset-0 bg-[rgba(26,34,56,0.4)]"
      />
      <div className="relative flex flex-col gap-md rounded-t-md bg-card p-md shadow-sheet">
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
