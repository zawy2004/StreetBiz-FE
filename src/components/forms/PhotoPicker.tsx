import { useRef } from 'react';

import { Icon } from '@/components/common';
import { colors } from '@/theme';

type Props = {
  label: string;
  uri?: string;
  /** Receives a preview URL plus the picked File, for callers that upload it. */
  onChange: (uri: string, file: File) => void;
  onRemove?: () => void;
  /** Optional check run before `onChange`; return a message to reject the file. */
  validate?: (file: File) => string | undefined;
  onInvalid?: (message: string) => void;
  error?: boolean;
};

const SIZE = 96;

export function PhotoPicker({ label, uri, onChange, onRemove, validate, onInvalid, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validate?.(file);
    if (problem) {
      onInvalid?.(problem);
      return;
    }
    onChange(URL.createObjectURL(file), file);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      aria-label={label}
      onChange={(e) => {
        handleFile(e.target.files?.[0]);
        // Allow picking the same file again after removing it.
        e.target.value = '';
      }}
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
            aria-label={`Xoá ảnh ${label}`}
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
        className={`flex h-full w-full flex-col items-center justify-center rounded-sm border border-dashed p-2xs text-center ${error ? 'border-error' : 'border-border'}`}
      >
        <Icon name="camera-plus-outline" size={24} color={error ? colors.error : colors.muted} />
        <span className="mt-1 line-clamp-2 text-body-sm text-muted">{label}</span>
      </button>
    </div>
  );
}
