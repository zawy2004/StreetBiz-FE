import { useState } from 'react';

import { Icon } from '@/components/common';
import { apiAssetUrl } from '@/core/api/asset-url';
import { SlotPhotoViewer } from './SlotPhotoViewer';

type Props = {
  urls: string[];
  slotCode: string;
  /** Caption under the photo ("Ảnh hiện trạng"); the docked panel leaves it out. */
  caption?: boolean;
};

/**
 * The slot's cover photo. With more than one photo it carries a "+N" badge and opens the
 * viewer with all of them; with one it is just the picture.
 */
export function SlotCover({ urls, slotCode, caption = false }: Props) {
  const [open, setOpen] = useState(false);
  const extra = urls.length - 1;
  const image = (
    <img
      src={apiAssetUrl(urls[0]!)}
      alt={`Ô ${slotCode}`}
      loading="lazy"
      width={640}
      height={360}
      className="aspect-video w-full rounded-[20px] bg-sunken object-cover ring-1 ring-border"
    />
  );

  return (
    <figure className="flex flex-col gap-xs">
      {extra > 0 ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Xem ${urls.length} ảnh của ô ${slotCode}`}
          className="relative block rounded-[20px] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {image}
          <span
            aria-hidden="true"
            className="absolute bottom-sm right-sm inline-flex h-9 items-center gap-1 rounded-full bg-black/65 px-sm text-label font-bold text-white"
          >
            <Icon name="plus" size={16} color="currentColor" />
            {extra}
          </span>
        </button>
      ) : (
        image
      )}
      {caption ? <figcaption className="text-body-sm text-muted">Ảnh hiện trạng</figcaption> : null}
      {open ? <SlotPhotoViewer urls={urls} slotCode={slotCode} onClose={() => setOpen(false)} /> : null}
    </figure>
  );
}
