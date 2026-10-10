import { useRef, useState } from 'react';

import { Icon, type IconName } from '@/components/common';

export type EvidenceStatus = 'idle' | 'uploading' | 'saved' | 'failed' | 'local';

type Props = {
  /** Also the file input's accessible name, exactly as PhotoPicker used it. */
  label: string;
  uri?: string;
  onChange: (uri: string, file: File) => void;
  onRemove: () => void;
  status: EvidenceStatus;
};

const STATUS: Record<
  Exclude<EvidenceStatus, 'idle' | 'uploading'>,
  { text: string; icon: IconName; className: string }
> = {
  saved: {
    text: 'Đã lưu lên máy chủ',
    icon: 'cloud-check-outline',
    className: 'bg-[#E6F6EC] text-[#0B5D33] dark:bg-[#10301F] dark:text-[#8BE3B0]',
  },
  failed: {
    text: 'Tải lên thất bại. Xoá ảnh rồi chọn lại.',
    icon: 'alert-circle-outline',
    className: 'bg-[#FDEBEA] text-[#8F1717] dark:bg-[#3A1414] dark:text-[#FF9A90]',
  },
  local: {
    text: 'Ảnh xem trước, chế độ dữ liệu mẫu',
    icon: 'information-outline',
    className: 'bg-[#EEF1F4] text-[#2B3640] dark:bg-[#1D2833] dark:text-[#C5D0DA]',
  },
};

/**
 * The scene photo as an evidence print: a large 4:3 frame, its upload state
 * pinned to the corner in words. Picking works exactly as PhotoPicker does
 * (image/* only, no `capture`, a blob: preview handed to `onChange` with the
 * File); the screen alone uploads it and decides what is sent.
 */
export function EvidenceFrame({ label, uri, onChange, onRemove, status }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isNonImage, setIsNonImage] = useState(false);
  const [broken, setBroken] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setIsNonImage(!file.type.startsWith('image/'));
    setBroken(false);
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

  const frame = 'relative aspect-[4/3] w-full overflow-hidden rounded-[20px] lg:max-w-[560px]';

  if (!uri) {
    return (
      <div className={frame}>
        {fileInput}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="group flex h-full w-full flex-col items-center justify-center gap-sm rounded-[20px] border-2 border-dashed border-border bg-[#FFF3E8]/60 p-md text-center transition-colors hover:border-primary/50 dark:bg-sunken/60"
        >
          <span
            aria-hidden="true"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-card text-primary shadow-card transition-transform duration-200 group-hover:scale-105"
          >
            <Icon name="camera-plus-outline" size={30} color="currentColor" />
          </span>
          <span className="text-[16px] font-semibold text-text">{label}</span>
          <span className="max-w-[34ch] text-body-sm text-muted">
            Chụp hoặc chọn ảnh rõ vạch sơn, vật dụng lấn chiếm và biển hiệu của quầy.
          </span>
        </button>
      </div>
    );
  }

  const pill = status === 'idle' || status === 'uploading' ? null : STATUS[status];

  return (
    <div className={`${frame} bg-sunken shadow-card ring-1 ring-border`}>
      {fileInput}
      <span className="sr-only" aria-live="polite">
        {status === 'uploading' ? 'Đang tải ảnh lên...' : (pill?.text ?? '')}
      </span>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="block h-full w-full"
      >
        {isNonImage || broken ? (
          <span className="flex h-full w-full flex-col items-center justify-center gap-xs text-muted">
            <Icon name="file-document-outline" size={36} color="currentColor" />
            <span className="text-body-md">Đã chọn file</span>
          </span>
        ) : (
          <img
            src={uri}
            alt={label}
            onError={() => setBroken(true)}
            className="h-full w-full object-cover"
          />
        )}
      </button>

      {status === 'uploading' ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-sm bg-card/60"
        >
          <span className="h-10 w-10 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
          <span className="rounded-full bg-card px-sm py-1 text-label text-text shadow-card">
            Đang tải ảnh lên...
          </span>
        </div>
      ) : null}

      {pill ? (
        <span
          className={`pointer-events-none absolute bottom-sm left-sm right-[72px] flex w-fit items-center gap-1.5 rounded-full px-sm py-1.5 text-label shadow-card ${pill.className}`}
        >
          <Icon name={pill.icon} size={16} color="currentColor" className="shrink-0" />
          {pill.text}
        </span>
      ) : null}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`Xoá ảnh ${label}`}
        className="absolute right-sm top-sm flex h-12 w-12 items-center justify-center rounded-full bg-card/90 text-text shadow-card backdrop-blur hover:bg-card"
      >
        <Icon name="trash-can-outline" size={20} color="currentColor" />
      </button>
    </div>
  );
}
