import { describe, expect, it } from 'vitest';

import {
  MIN_LABEL_GAP_PX,
  visibleMonthLabels,
} from '@/features/rental-contracts/components/term-timeline-labels';
import { evidenceLabel, evidenceLabels } from '@/features/ward-administration/ward-api';

describe('contract timeline month labels', () => {
  it('keeps every month when the track is wide enough', () => {
    expect([...visibleMonthLabels([0.1, 0.3, 0.5, 0.7, 0.9], 800)]).toEqual([0, 1, 2, 3, 4]);
  });

  it('never keeps two labels closer than the minimum gap', () => {
    // Twelve months on a 260px phone track: 21px apart, so every other label goes.
    const positions = Array.from({ length: 12 }, (_, i) => (i + 0.5) / 12);
    const kept = [...visibleMonthLabels(positions, 260)];

    for (let k = 1; k < kept.length; k += 1) {
      expect((positions[kept[k]!]! - positions[kept[k - 1]!]!) * 260).toBeGreaterThanOrEqual(
        MIN_LABEL_GAP_PX,
      );
    }
  });

  it('keeps the first and the last month, dropping a neighbour of the last if needed', () => {
    // The old rule labelled 0.80 and 0.86 together: "T11T12".
    const positions = [0.05, 0.5, 0.8, 0.86];
    const kept = visibleMonthLabels(positions, 300);

    expect(kept.has(0)).toBe(true);
    expect(kept.has(3)).toBe(true);
    expect(kept.has(2)).toBe(false);
  });

  it('handles one month and no months', () => {
    expect([...visibleMonthLabels([0.4], 260)]).toEqual([0]);
    expect([...visibleMonthLabels([], 260)]).toEqual([]);
  });
});

describe('evidence names for the ward officer', () => {
  it('names both sides of the citizen ID and the portrait', () => {
    expect(evidenceLabels.IDENTITY_DOCUMENT).toBe('CCCD mặt trước');
    expect(evidenceLabels.IDENTITY_DOCUMENT_BACK).toBe('CCCD mặt sau');
    expect(evidenceLabels.PORTRAIT_SELFIE).toBe('Ảnh chân dung');
  });

  it('translates a code even when an older API sent the code as the label', () => {
    expect(evidenceLabel({ type: 'IDENTITY_DOCUMENT_BACK', label: 'IDENTITY_DOCUMENT_BACK' })).toBe(
      'CCCD mặt sau',
    );
  });

  it('keeps a real label for an unknown type and never shows a bare code', () => {
    expect(evidenceLabel({ type: 'NEW_KIND', label: 'Giấy xác nhận cư trú' })).toBe(
      'Giấy xác nhận cư trú',
    );
    expect(evidenceLabel({ type: 'NEW_KIND', label: 'NEW_KIND' })).toBe('Giấy tờ khác');
    expect(evidenceLabel({ type: 'NEW_KIND' })).toBe('Giấy tờ khác');
  });
});
