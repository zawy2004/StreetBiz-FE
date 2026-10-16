import { useRef, useState } from 'react';

import { Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { apiAssetUrl } from '@/core/api/asset-url';
import { errorMessage, wardConfigApi } from '../../../ward-config-api';

export const MAX_SLOT_PHOTOS = 6;
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

type Props = {
  /** Photo URLs in order; the first is the cover. */
  value: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
};

/**
 * The slot's photos for the ward officer: add several (each uploaded as soon as it is
 * picked), drop one, or move one to the front as the cover. Nothing is saved to the slot
 * until the form's own save.
 */
export function SlotPhotosField({ value, onChange, disabled = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const full = value.length + uploading >= MAX_SLOT_PHOTOS;

  const add = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MAX_SLOT_PHOTOS - value.length - uploading;
    const picked = Array.from(files).slice(0, Math.max(room, 0));
    if (files.length > picked.length) showToast(`Mỗi ô tối đa ${MAX_SLOT_PHOTOS} ảnh.`);

    const uploaded: string[] = [];
    for (const file of picked) {
      if (!TYPES.includes(file.type)) {
        showToast('Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.');
        continue;
      }
      if (file.size > MAX_BYTES) {
        showToast('Ảnh quá lớn, tối đa 5 MB.');
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const result = await wardConfigApi.uploadSlotImage(file);
        uploaded.push(result.fileUrl);
      } catch (error) {
        showToast(errorMessage(error));
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    if (inputRef.current) inputRef.current.value = '';
  };

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));
  const makeCover = (index: number) =>
    onChange([value[index]!, ...value.filter((_, i) => i !== index)]);

  return (
    <div className="flex flex-col gap-xs">
      <ul className="grid max-w-[420px] grid-cols-3 gap-xs">
        {value.map((url, index) => (
          <li
            key={url}
            className="relative aspect-square overflow-hidden rounded-[12px] bg-sunken ring-1 ring-border"
          >
            <img
              src={apiAssetUrl(url)}
              alt={`Ảnh ô ${index + 1}`}
              loading="lazy"
              className="h-full w-full object-cover"
            />
            {index === 0 ? (
              <span className="absolute left-1 top-1 rounded-full bg-primary px-2 py-0.5 text-body-xs font-bold text-on-primary">
                Ảnh bìa
              </span>
            ) : (
              <button
                type="button"
                disabled={disabled}
                onClick={() => makeCover(index)}
                className="absolute bottom-1 left-1 rounded-full bg-black/65 px-2 py-0.5 text-body-xs font-semibold text-white disabled:opacity-50"
              >
                Đặt làm bìa
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Xóa ảnh ${index + 1}`}
              onClick={() => remove(index)}
              className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-black/65 text-white disabled:opacity-50"
            >
              <Icon name="close" size={16} color="currentColor" />
            </button>
          </li>
        ))}
        {Array.from({ length: uploading }).map((_, i) => (
          <li
            key={`uploading-${i}`}
            aria-label="Đang tải ảnh"
            className="flex aspect-square animate-pulse items-center justify-center rounded-[12px] bg-sunken ring-1 ring-border"
          >
            <Icon name="camera-plus-outline" size={22} color="currentColor" className="text-muted" />
          </li>
        ))}
        {!full ? (
          <li>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-[12px] border-2 border-dashed border-border text-label font-semibold text-primary transition-colors hover:bg-tint-primary disabled:opacity-50"
            >
              <Icon name="camera-plus-outline" size={22} color="currentColor" />
              Thêm ảnh
            </button>
          </li>
        ) : null}
      </ul>
      <input
        ref={inputRef}
        type="file"
        accept={TYPES.join(',')}
        multiple
        hidden
        data-testid="slot-photo-input"
        onChange={(event) => void add(event.target.files)}
      />
      <p className="text-body-sm text-muted">
        {value.length}/{MAX_SLOT_PHOTOS} ảnh · Ảnh đầu là ảnh bìa, hộ kinh doanh bấm vào để xem hết.
      </p>
    </div>
  );
}
