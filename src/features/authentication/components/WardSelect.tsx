import { useId } from 'react';

import { useWards } from '@/core/auth/useWards';

type Props = {
  value: number | undefined;
  onChange: (unitId: number | undefined) => void;
  label?: string;
  helperText?: string;
  error?: string;
  /** Hides the "no selection" option, for the required ward on a registration. */
  required?: boolean;
};

/**
 * Ward picker backed by `GET /api/administrative-units/wards`. A native select
 * keeps long ward lists usable on a phone without a custom dropdown.
 */
export function WardSelect({
  value,
  onChange,
  label = 'Phường/xã',
  helperText,
  error,
  required,
}: Props) {
  const { wards, loading, error: loadError } = useWards();
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? loadError;

  return (
    <div className="flex flex-col gap-2xs">
      <label htmlFor={id} className="text-label text-text">
        {label}
      </label>
      <select
        id={id}
        value={value === undefined ? '' : String(value)}
        disabled={loading || wards.length === 0}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        aria-invalid={message ? true : undefined}
        aria-describedby={message || helperText ? messageId : undefined}
        className={[
          'h-12 w-full rounded-sm border bg-card px-sm text-body-lg text-text disabled:opacity-60',
          message ? 'border-error' : 'border-border',
        ].join(' ')}
      >
        {!required || value === undefined ? (
          <option value="">{loading ? 'Đang tải danh sách…' : '— Chọn phường/xã —'}</option>
        ) : null}
        {wards.map((ward) => (
          <option key={ward.unitId} value={ward.unitId}>
            {ward.parentName ? `${ward.unitName} · ${ward.parentName}` : ward.unitName}
          </option>
        ))}
      </select>
      {message ? (
        <span id={messageId} className="text-body-sm text-error">
          {message}
        </span>
      ) : helperText ? (
        <span id={messageId} className="text-body-sm text-muted">
          {helperText}
        </span>
      ) : null}
    </div>
  );
}
