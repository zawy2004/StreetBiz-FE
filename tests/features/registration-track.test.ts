import { describe, expect, it } from 'vitest';

import { registrationTrack } from '@/features/business-registrations/registration-track';

const CREATED = '2026-09-26T03:00:00Z';
const REVIEWED = '2026-09-30T03:00:00Z';

describe('registrationTrack', () => {
  it('always draws three stops: Đã nộp, Phường xét, Kết quả', () => {
    for (const status of [
      'DRAFT',
      'SUBMITTED',
      'UNDER_REVIEW',
      'MORE_INFORMATION_REQUIRED',
      'APPROVED',
      'REJECTED',
      'WITHDRAWN',
      'SOMETHING_NEW',
    ]) {
      const model = registrationTrack(status, CREATED, REVIEWED);
      expect(model.steps.map((s) => s.label)).toEqual(['Đã nộp', 'Phường xét', 'Kết quả']);
      expect(model.currentIndex).toBeGreaterThanOrEqual(0);
      expect(model.currentIndex).toBeLessThanOrEqual(2);
      expect(model.progress).toBeGreaterThanOrEqual(0);
      expect(model.progress).toBeLessThanOrEqual(1);
    }
  });

  it('shows a draft as not started', () => {
    const model = registrationTrack('DRAFT', null, null);

    expect(model.steps.map((s) => s.state)).toEqual(['current', 'todo', 'todo']);
    expect(model.steps[0]?.note).toBe('Nháp');
    expect(model).toMatchObject({ currentIndex: 0, tone: 'neutral', progress: 0 });
  });

  it.each([
    ['SUBMITTED', 'Chờ xét'],
    ['UNDER_REVIEW', 'Đang xét'],
  ])('puts %s at the ward stop, half way along', (status, note) => {
    const model = registrationTrack(status, CREATED, null);

    expect(model.steps.map((s) => s.state)).toEqual(['done', 'current', 'todo']);
    expect(model.steps[1]?.note).toBe(note);
    expect(model.steps[0]?.note).toMatch(/^\d{2}[/-]\d{2}$/);
    expect(model).toMatchObject({ currentIndex: 1, tone: 'pending', progress: 0.5 });
  });

  it('sends the arrow back to stop 1 when the ward asks for more information', () => {
    const model = registrationTrack('MORE_INFORMATION_REQUIRED', CREATED, REVIEWED);

    expect(model.steps.map((s) => s.state)).toEqual(['returned', 'paused', 'todo']);
    expect(model.steps[0]?.note).toBe('Bạn cần bổ sung');
    expect(model.currentIndex).toBe(0);
    expect(model.tone).toBe('pending');
  });

  it('paints an approved file all the way, with the review date', () => {
    const model = registrationTrack('APPROVED', CREATED, REVIEWED);

    expect(model.steps.map((s) => s.state)).toEqual(['done', 'done', 'approved']);
    expect(model.steps[2]?.note).toMatch(/^Đã duyệt \d{2}[/-]\d{2}$/);
    expect(model).toMatchObject({ currentIndex: 2, tone: 'ok', progress: 1 });
  });

  it('says plain "Đã duyệt" when the review date is missing', () => {
    expect(registrationTrack('APPROVED', CREATED, null).steps[2]?.note).toBe('Đã duyệt');
    expect(registrationTrack('APPROVED', CREATED, undefined).steps[2]?.note).toBe('Đã duyệt');
  });

  it('marks a rejection in the danger tone', () => {
    const model = registrationTrack('REJECTED', CREATED, REVIEWED);

    expect(model.steps[2]).toMatchObject({ state: 'rejected' });
    expect(model.steps[2]?.note).toMatch(/^Từ chối \d{2}[/-]\d{2}$/);
    expect(model.tone).toBe('danger');
    expect(registrationTrack('REJECTED', CREATED, null).steps[2]?.note).toBe('Từ chối');
  });

  it('greys out a withdrawn file and stops the line at the start', () => {
    const model = registrationTrack('WITHDRAWN', CREATED, null);

    expect(model.steps.every((s) => s.state === 'withdrawn')).toBe(true);
    expect(model.steps[0]?.note).toBe('Đã rút');
    expect(model).toMatchObject({ tone: 'neutral', progress: 0, currentIndex: 0 });
  });

  it('treats a status it does not know like a neutral start instead of throwing', () => {
    const model = registrationTrack('SOMETHING_NEW', CREATED, REVIEWED);

    expect(model.steps.map((s) => s.state)).toEqual(['current', 'todo', 'todo']);
    expect(model).toMatchObject({ tone: 'neutral', progress: 0 });
  });
});
