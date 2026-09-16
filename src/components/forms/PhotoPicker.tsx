import { useRef } from 'react';

import { Icon } from '@/components/common';
import { colors } from '@/theme';

type Props = {
  label: string;
  uri?: string;
  onChange: (uri: string) => void;
  onRemove?: () => void;
};

const SIZE = 96;

export function PhotoPicker({ label, uri, onChange, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onChange(URL.createObjectURL(file));
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => handleFile(e.target.files?.[0])}
    />
  );

  if (uri) {
    return (
      <div
        style={{ width: SIZE, height: SIZE }}
        className="relative overflow-hidden rounded-sm"
      >
        {fileInput}
        <button type="button" onClick={() => inputRef.current?.click()} className="h-full w-full">
          <img src={uri} alt={label} className="h-full w-full object-cover" />
        </button>
        <div className="absolute inset-x-0 bottom-0 truncate bg-[rgba(26,34,56,0.7)] px-1.5 py-0.5 text-body-sm text-white">
          {label}
        </div>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label="Xoá ảnh"
            className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(26,34,56,0.7)]"
          >
            <Icon name="close" size={14} color={colors.white} />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ width: SIZE, height: SIZE }}>
      {fileInput}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed border-border p-2xs text-center"
      >
        <Icon name="camera-plus-outline" size={24} color={colors.muted} />
        <span className="mt-1 line-clamp-2 text-body-sm text-muted">{label}</span>
      </button>
    </div>
  );
}
