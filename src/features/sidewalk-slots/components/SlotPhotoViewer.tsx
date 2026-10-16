import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/common';
import { apiAssetUrl } from '@/core/api/asset-url';

type Props = {
  urls: string[];
  slotCode: string;
  /** Which photo opens first. */
  startIndex?: number;
  onClose: () => void;
};

/**
 * Every photo of a slot, one large at a time: arrows or the arrow keys to move, Esc or the
 * backdrop to close. Opens from the cover's "+N" badge.
 */
export function SlotPhotoViewer({ urls, slotCode, startIndex = 0, onClose }: Props) {
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), urls.length - 1));
  const closeRef = useRef<HTMLButtonElement>(null);
  const many = urls.length > 1;

  const go = (step: number) => setIndex((current) => (current + step + urls.length) % urls.length);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowRight' && urls.length > 1) setIndex((i) => (i + 1) % urls.length);
      else if (event.key === 'ArrowLeft' && urls.length > 1)
        setIndex((i) => (i - 1 + urls.length) % urls.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, urls.length]);

  const arrow =
    'absolute top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Ảnh ô ${slotCode}`}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-md"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-full w-full max-w-[960px] flex-col items-center gap-sm"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={apiAssetUrl(urls[index]!)}
          alt={`Ô ${slotCode}, ảnh ${index + 1}`}
          className="max-h-[78vh] w-full rounded-[16px] bg-black object-contain"
        />
        <p className="text-label font-semibold text-white" aria-live="polite">
          {index + 1}/{urls.length}
        </p>
        {many ? (
          <>
            <button type="button" aria-label="Ảnh trước" onClick={() => go(-1)} className={`${arrow} left-sm`}>
              <Icon name="chevron-left" size={26} color="currentColor" />
            </button>
            <button type="button" aria-label="Ảnh sau" onClick={() => go(1)} className={`${arrow} right-sm`}>
              <Icon name="chevron-right" size={26} color="currentColor" />
            </button>
          </>
        ) : null}
        <button
          ref={closeRef}
          type="button"
          aria-label="Đóng"
          onClick={onClose}
          className="absolute right-sm top-sm flex h-12 w-12 items-center justify-center rounded-full bg-black/55 text-white transition-colors hover:bg-black/75 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Icon name="close" size={24} color="currentColor" />
        </button>
      </div>
    </div>
  );
}
