import { useNavigate } from 'react-router-dom';

import { Icon } from '@/components/common';

/**
 * "Quay lại" as a 44px round button (buyer touch target), for pages whose
 * header is a photo, or that have no data yet (loading, error), so the buyer
 * is never stuck. Same as the header's back: one step back in history.
 */
export function BackButton({
  floating = false,
  className = '',
}: {
  /** On a photo: frosted card so it reads on any image. */
  floating?: boolean;
  className?: string;
}) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      aria-label="Quay lại"
      onClick={() => navigate(-1)}
      className={[
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-text transition-[background-color,transform] duration-150 active:scale-95',
        floating
          ? 'bg-card/90 shadow-card ring-1 ring-black/5 backdrop-blur-md hover:bg-card'
          : 'bg-card shadow-card ring-1 ring-border hover:bg-sunken',
        className,
      ].join(' ')}
    >
      <Icon name="arrow-left" size={20} color="currentColor" />
    </button>
  );
}
