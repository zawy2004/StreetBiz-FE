import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  distanceLabel,
  distanceMeters,
  followUps,
  requestLocation,
  speakable,
  usePreference,
  useReadAloud,
  useSmoothText,
} from '@/features/assistant/assistant-ux';
import type { AssistantMessage } from '@/features/assistant/types';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetModules();
});

const answer = (sourceIds: string[], over: Partial<AssistantMessage> = {}): AssistantMessage =>
  ({
    id: 'm1',
    sender: 'ASSISTANT',
    status: 'COMPLETED',
    content: '',
    sources: sourceIds.map((id) => ({ id, kind: 'TOOL', title: id })),
    ...over,
  }) as unknown as AssistantMessage;

describe('assistant follow-up questions', () => {
  it('offers questions about what was just looked up, at most three', () => {
    expect(followUps(answer(['t:public.food']), 'CUSTOMER')).toEqual([
      'Quán nào đang mở cửa?',
      'Làm sao kiểm tra giấy phép của quán?',
    ]);
    expect(
      followUps(answer(['t:vendor.fees', 't:vendor.contract', 't:vendor.registration']), 'VENDOR'),
    ).toHaveLength(3);
    expect(followUps(answer(['t:ward.dashboard']), 'WARD_AUTHORITY')[0]).toBe(
      'Hồ sơ nào đang chờ xử lý?',
    );
    expect(followUps(answer(['t:ward.slot_permit']), 'WARD_AUTHORITY')).toHaveLength(1);
    expect(followUps(answer(['t:vendor.registrations']), 'VENDOR')[0]).toBe(
      'Hồ sơ của tôi cần bổ sung gì?',
    );
  });

  it('offers food questions after a photo was read, and nothing for an unfinished or own message', () => {
    const photo = answer([], {
      sources: [{ id: 'x', kind: 'IMAGE_ANALYSIS', title: 'ảnh' }],
    } as never);
    expect(followUps(photo, 'CUSTOMER')).toHaveLength(2);
    expect(
      followUps(answer(['t:public.food'], { status: 'STREAMING' } as never), 'CUSTOMER'),
    ).toEqual([]);
    expect(followUps(answer(['t:public.food'], { sender: 'USER' } as never), 'CUSTOMER')).toEqual(
      [],
    );
  });
});

describe('assistant reading and distances', () => {
  it('turns markdown into plain speech', () => {
    expect(
      speakable('[AI] **Quán** _mở_ `ngay`\n- [Xem](https://x) ![ảnh](a.png)\n\n> trích'),
    ).toBe('Quán mở ngay. Xem. trích');
  });

  it('measures and labels distances', () => {
    const a = { latitude: 16.06, longitude: 108.21 };
    expect(distanceMeters(a, a)).toBe(0);
    expect(distanceMeters(a, { latitude: 16.07, longitude: 108.21 })).toBeCloseTo(1112, -1);
    expect(distanceLabel(null)).toBeUndefined();
    expect(distanceLabel(12)).toBe('~50 m');
    expect(distanceLabel(234)).toBe('~250 m');
    expect(distanceLabel(1500)).toBe('~1,5 km');
  });

  it('asks the browser for a position and explains a refusal or no support', async () => {
    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 16, longitude: 108 } } as GeolocationPosition),
      },
    });
    await expect(requestLocation()).resolves.toEqual({ latitude: 16, longitude: 108 });

    vi.stubGlobal('navigator', {
      geolocation: {
        getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) =>
          fail({} as GeolocationPositionError),
      },
    });
    await expect(requestLocation()).rejects.toThrow('Chưa có quyền vị trí');

    vi.stubGlobal('navigator', {});
    await expect(requestLocation()).rejects.toThrow('Thiết bị không hỗ trợ định vị.');
  });
});

describe('assistant preferences and read-aloud', () => {
  beforeEach(() => localStorage.clear());

  it('remembers a preference, and falls back when storage is unavailable', () => {
    const { result } = renderHook(() => usePreference('sb:test-pref', true));
    expect(result.current[0]).toBe(true);
    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
    expect(localStorage.getItem('sb:test-pref')).toBe('0');

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const blocked = renderHook(() => usePreference('sb:other', true));
    expect(blocked.result.current[0]).toBe(true);
    act(() => blocked.result.current[1](false));
    expect(blocked.result.current[0]).toBe(false);
  });

  it('reads one answer aloud in Vietnamese, and stops it on a second tap', () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal('speechSynthesis', {
      speak,
      cancel,
      getVoices: () => [{ lang: 'vi-VN', name: 'Linh' }],
    });
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      class {
        lang = '';
        voice: unknown = null;
        rate = 0;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(public text: string) {}
      },
    );

    const { result, unmount } = renderHook(() => useReadAloud());
    expect(result.current.supported).toBe(true);
    act(() => result.current.toggle('m1', '**Xin chào**'));
    expect(result.current.speaking).toBe('m1');
    const utterance = speak.mock.calls[0]![0] as { text: string; lang: string; onend: () => void };
    expect(utterance.text).toBe('Xin chào');
    expect(utterance.lang).toBe('vi-VN');

    act(() => result.current.toggle('m1', '**Xin chào**'));
    expect(result.current.speaking).toBeUndefined();

    act(() => result.current.toggle('m2', 'Hai'));
    act(() => (speak.mock.calls.at(-1)![0] as { onend: () => void }).onend());
    expect(result.current.speaking).toBeUndefined();
    unmount();
    expect(cancel).toHaveBeenCalled();
  });

  it('shows streamed text at once when not streaming', () => {
    const { result, rerender } = renderHook(
      ({ text, streaming }) => useSmoothText(text, streaming),
      {
        initialProps: { text: 'Xin', streaming: false },
      },
    );
    expect(result.current).toBe('Xin');
    rerender({ text: 'Xin chào', streaming: false });
    expect(result.current).toBe('Xin chào');
  });
});

describe('new-order chime', () => {
  function fakeAudio(state: 'suspended' | 'running') {
    const oscillators: { start: ReturnType<typeof vi.fn> }[] = [];
    class FakeContext {
      state = state;
      currentTime = 1;
      destination = {};
      resume = vi.fn(async () => {
        this.state = 'running';
      });
      createOscillator() {
        const node = {
          type: '',
          frequency: { value: 0 },
          connect: (g: unknown) => g,
          start: vi.fn(),
          stop: vi.fn(),
        };
        oscillators.push(node);
        return node;
      }
      createGain() {
        const gain = { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() };
        return { gain, connect: (d: unknown) => d };
      }
    }
    vi.stubGlobal('AudioContext', FakeContext);
    return oscillators;
  }

  it('stays silent until a gesture unlocks audio, then plays two notes', async () => {
    const oscillators = fakeAudio('suspended');
    const chime = await import('@/core/attention/chime');

    expect(chime.playChime()).toBe(false);
    expect(chime.chimeReady()).toBe(false);
    const unlock = chime.unlockChimeOnFirstGesture();
    window.dispatchEvent(new Event('pointerdown'));
    await vi.waitFor(() => expect(chime.chimeReady()).toBe(true));
    expect(typeof unlock).toBe('function');

    expect(chime.playChime()).toBe(true);
    expect(oscillators).toHaveLength(2);
    expect(oscillators.every((o) => o.start.mock.calls.length === 1)).toBe(true);
  });

  it('reports no audio where the browser has none, or when it refuses', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const none = await import('@/core/attention/chime');
    await expect(none.unlockChime()).resolves.toBe(false);

    vi.resetModules();
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw new Error('blocked');
        }
      },
    );
    const refused = await import('@/core/attention/chime');
    await expect(refused.unlockChime()).resolves.toBe(false);
  });
});
