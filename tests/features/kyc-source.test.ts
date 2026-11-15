import { describe, expect, it } from 'vitest';

import { kycSource } from '@/features/business-registrations/kyc-source';

describe('kycSource', () => {
  it('uses the provider the server names, not a fixed one', () => {
    expect(kycSource('[AI - Gemini Vision] FPT.AI không dùng được, Gemini đọc thay.', true)).toEqual({
      label: 'AI - Gemini Vision',
      text: 'FPT.AI không dùng được, Gemini đọc thay.',
    });
    expect(kycSource('[AI - FPT.AI + Gemini Vision] Đã đọc hai mặt.', true).label).toBe(
      'AI - FPT.AI + Gemini Vision',
    );
  });

  it('says so plainly when no AI answered', () => {
    const result = kycSource('[Hệ thống — chưa xác minh bằng AI] Không gọi được dịch vụ eKYC.', false);
    expect(result.label).toBe('Hệ thống — chưa xác minh bằng AI');
    expect(result.text).toBe('Không gọi được dịch vụ eKYC.');
  });

  it('falls back on the isAiGenerated flag when the text carries no tag', () => {
    expect(kycSource('Đã đọc.', true)).toEqual({ label: 'AI', text: 'Đã đọc.' });
    expect(kycSource('Không đọc được.', false).label).toBe('Hệ thống — chưa xác minh bằng AI');
  });

  it('only strips a tag at the very start', () => {
    expect(kycSource('Độ khớp [cao] 90%.', true).text).toBe('Độ khớp [cao] 90%.');
  });
});
