import { useEffect, useState } from 'react';

import { STATUS_LABELS } from '@/core/constants/status-labels';
import type { StatusTone } from '@/theme';
import type { CaseKind } from '../../ward-api';
import { canAnimate } from './format';

/** Tone of a raw case status code (labels still come from the ward's own statusLabel). */
export function caseTone(status: string): StatusTone {
  return STATUS_LABELS[status]?.tone ?? 'neutral';
}

/** One line about each kind, in the officer's words. */
export const CASE_KIND_NOTES: Record<CaseKind, string> = {
  proposals: 'Hộ đề xuất vị trí ô mới; kiểm tra ranh giới trước khi lưu tọa độ',
  conflicts: 'Nhiều hộ xin cùng một địa chỉ; xếp hàng theo thứ tự chờ',
  transfers: 'Chuyển hợp đồng ô sang hộ khác; bên chuyển phải sạch nợ',
};

/**
 * Grows from 0 to `target` (0..1) one frame after mount, so a CSS transition on
 * width / scale plays once. Reduced motion is handled by the global CSS rule.
 */
export function useGrowOnMount(target: number): number {
  const [value, setValue] = useState(() => (canAnimate() ? 0 : target));
  useEffect(() => {
    if (!canAnimate()) {
      setValue(target);
      return;
    }
    const frame = requestAnimationFrame(() => setValue(target));
    return () => cancelAnimationFrame(frame);
  }, [target]);
  return value;
}
