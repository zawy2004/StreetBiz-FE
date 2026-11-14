import { useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Icon } from '@/components/common';
import { showToast } from '@/components/feedback';
import { accountApi, errorMessage } from '@/core/api';
import { photoFileProblem } from '@/core/utils/photo-file';
import { useAuthStore } from '@/store/auth-store';

/**
 * "Đổi ảnh" / "Gỡ ảnh" under the name on the account plate. The photo is public (it shows in chat
 * and on account lists), so the server crops it to a square and strips its metadata.
 */
export function ProfilePhotoActions({ hasPhoto }: { hasPhoto: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const setAvatarUrl = useAuthStore((s) => s.setAvatarUrl);
  const [error, setError] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: (file: File) => accountApi.uploadAvatar(file),
    onSuccess: (result) => {
      setAvatarUrl(result.avatarUrl);
      showToast('Đã cập nhật ảnh đại diện');
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: () => accountApi.removeAvatar(),
    onSuccess: () => {
      setAvatarUrl(null);
      showToast('Đã gỡ ảnh đại diện');
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const busy = upload.isPending || remove.isPending;

  const pick = (file: File | undefined) => {
    if (!file) return;
    const problem = photoFileProblem(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    upload.mutate(file);
  };

  const action =
    'inline-flex h-9 items-center gap-1.5 rounded-[10px] px-sm text-label font-semibold transition-colors disabled:opacity-60';

  return (
    <div className="flex flex-col gap-1 pt-xs">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Chọn ảnh đại diện"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
      <div className="flex flex-wrap gap-xs">
        <button
          type="button"
          disabled={busy}
          onClick={() => input.current?.click()}
          className={`${action} bg-tint-primary text-primary-pressed hover:bg-primary/15`}
        >
          <Icon name="camera-plus-outline" size={16} color="currentColor" />
          {upload.isPending ? 'Đang tải ảnh…' : hasPhoto ? 'Đổi ảnh' : 'Thêm ảnh đại diện'}
        </button>
        {hasPhoto ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setError(null);
              remove.mutate();
            }}
            className={`${action} text-muted ring-1 ring-inset ring-border hover:bg-sunken`}
          >
            {remove.isPending ? 'Đang gỡ…' : 'Gỡ ảnh'}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-body-sm text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
