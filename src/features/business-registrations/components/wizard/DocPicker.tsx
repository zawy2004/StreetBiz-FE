import { useRef, useState, type ReactNode } from 'react';

import { Icon } from '@/components/common';

export type UploadState = 'uploading' | 'done' | 'error';

type Props = {
  label: string;
  uri?: string;
  /** MIME type of the picked file when the store still has it (PDF previews). */
  fileType?: string;
  /** Receives a preview URL plus the picked File, for callers that upload it. */
  onChange: (uri: string, file: File) => void;
  onRemove?: () => void;
  /** Checked before `onChange`; return a message to reject the file. */
  validate?: (file: File) => string | undefined;
  onInvalid?: (message: string) => void;
  error?: boolean;
  accept?: string;
  /** Drawing shown while empty (a CCCD side, a licence, a portrait…). */
  placeholder: ReactNode;
  /** Words for the empty slot's accessible name, e.g. "bắt buộc". */
  need?: string;
  /** Status pill drawn at the bottom of a picked document. */
  badge?: ReactNode;
  /** `card` 1.586:1 (ID card), `sheet` 4:3 (paper), `round` (portrait). */
  shape?: 'card' | 'sheet' | 'round';
  className?: string;
};

const SHAPE = {
  card: 'aspect-[1.586/1] rounded-[14px]',
  sheet: 'aspect-[4/3] rounded-[16px]',
  round: 'aspect-square rounded-full',
} as const;

/**
 * A document slot drawn at the document's own proportions. Behaves exactly like
 * the shared PhotoPicker (same hidden file input named by `label`, same
 * validate → onInvalid / onChange contract, same "Xoá ảnh {label}" control),
 * with a 44px remove button and room for an upload status pill.
 */
export function DocPicker({
  label,
  uri,
  fileType,
  onChange,
  onRemove,
  validate,
  onInvalid,
  error,
  accept = 'image/*',
  placeholder,
  need,
  badge,
  shape = 'card',
  className = '',
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // <img> cannot render a PDF; remember the picked file's type for a readable placeholder.
  const [isNonImage, setIsNonImage] = useState(false);
  const nonImage = fileType ? !fileType.startsWith('image/') : isNonImage;

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const problem = validate?.(file);
    if (problem) {
      onInvalid?.(problem);
      return;
    }
    setIsNonImage(!file.type.startsWith('image/'));
    onChange(URL.createObjectURL(file), file);
  };

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept={accept}
      className="hidden"
      aria-label={label}
      onChange={(e) => {
        handleFile(e.target.files?.[0]);
        // Allow picking the same file again after removing it.
        e.target.value = '';
      }}
    />
  );

  const frame = `relative w-full overflow-hidden ${SHAPE[shape]}`;

  if (uri) {
    return (
      <div className={`${frame} bg-sunken shadow-card ring-1 ring-border ${className}`}>
        {fileInput}
        <button
          type="button"
          aria-label={`${label}, đã chọn. Chọn ảnh khác`}
          onClick={() => inputRef.current?.click()}
          className="block h-full w-full"
        >
          {nonImage ? (
            <span className="flex h-full w-full flex-col items-center justify-center gap-1 bg-card">
              <Icon
                name="file-document-outline"
                size={32}
                color="currentColor"
                className="text-muted"
              />
              <span className="text-body-sm font-semibold text-muted">Đã chọn file</span>
            </span>
          ) : (
            <img
              src={uri}
              alt={label}
              className="h-full w-full animate-[sb-pop_200ms_var(--ease-out)_both] object-cover"
            />
          )}
        </button>
        {badge ? (
          <span
            className={`pointer-events-none absolute ${shape === 'round' ? 'inset-x-0 bottom-1 flex justify-center' : 'bottom-2 left-2'}`}
          >
            {badge}
          </span>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Xoá ảnh ${label}`}
            className={`absolute flex h-11 w-11 items-center justify-center rounded-full bg-card text-text shadow-card ring-1 ring-border transition-colors hover:bg-[#FDEBEA] hover:text-[#8F1717] ${
              shape === 'round' ? 'right-0 top-0' : 'right-1.5 top-1.5'
            }`}
          >
            <Icon name="close" size={18} color="currentColor" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`${frame} ${className}`}>
      {fileInput}
      <button
        type="button"
        aria-label={need ? `${label}, ${need}, chưa chọn` : `${label}, chưa chọn`}
        onClick={() => inputRef.current?.click()}
        className={`group flex h-full w-full flex-col items-center justify-center border-[2.5px] border-dashed bg-[#FFF3E8] p-xs text-center transition-colors hover:bg-[#FFEBD9] dark:bg-[#2A2420] dark:hover:bg-[#33291F] ${SHAPE[shape]} ${
          error ? 'border-[#8F1717] dark:border-[#FF9A90]' : 'border-brand/70'
        }`}
      >
        {placeholder}
      </button>
    </div>
  );
}

/** "Đang tải lên…" / "Đã lưu" / "Tải lên lỗi" on a picked document. */
export function UploadBadge({ state }: { state: UploadState }) {
  const tone =
    state === 'done'
      ? 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]'
      : state === 'error'
        ? 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]'
        : 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]';
  return (
    <span
      role="status"
      className={`relative inline-flex h-7 items-center gap-1.5 overflow-hidden rounded-full px-2.5 text-[12.5px] font-bold shadow-card ${tone}`}
    >
      <Icon
        name={
          state === 'done'
            ? 'check-circle'
            : state === 'error'
              ? 'alert-circle-outline'
              : 'cloud-check-outline'
        }
        size={15}
        color="currentColor"
      />
      {state === 'done' ? 'Đã lưu' : state === 'error' ? 'Tải lên lỗi' : 'Đang tải lên…'}
      {state === 'uploading' ? (
        <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden">
          <span className="block h-full w-full animate-[sb-shimmer_1.1s_linear_infinite] bg-[linear-gradient(90deg,transparent,rgb(var(--c-brand)),transparent)] bg-[length:220%_100%]" />
        </span>
      ) : null}
    </span>
  );
}
