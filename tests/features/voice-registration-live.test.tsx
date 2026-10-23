import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AssistDraft,
  AssistQuestion,
  AssistTurnResult,
} from '@/features/business-registrations/voice/voice-registration.types';

vi.mock('@/core/config/env', () => ({
  env: { apiBaseUrl: 'https://api.example.test/api', useMockApi: false, appEnv: 'test', goongMaptilesKey: '' },
  isDev: true,
  isLiveApi: true,
}));

const voiceApi = vi.hoisted(() => ({ turn: vi.fn(), confirm: vi.fn(), startLive: vi.fn() }));
vi.mock('@/features/business-registrations/voice/voice-registration-api', () => ({
  voiceRegistrationApi: voiceApi,
}));

vi.mock('@/core/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/api')>();
  return {
    ...actual,
    vendorRegistrationApi: { ...actual.vendorRegistrationApi, list: vi.fn().mockResolvedValue([]) },
    referenceApi: {
      ...actual.referenceApi,
      listWards: vi.fn().mockResolvedValue([{ unitId: 10, unitName: 'Phường Hải Châu', unitType: 'WARD', parentName: null }]),
    },
  };
});

vi.mock('@/features/sidewalk-slots/components/LocationPicker', () => ({
  LocationPicker: () => <div>map</div>,
}));

// The browser audio side (microphone, speaker) is replaced; the screen logic around it is real.
type LiveOptions = {
  onAssist: (result: AssistTurnResult, cause: 'voice' | 'screen') => void;
  onTurnComplete?: () => void;
  onStopped: (reason: string) => void;
};
const live = vi.hoisted(() => ({
  options: null as unknown as LiveOptions,
  setActive: (_: boolean) => {},
  start: vi.fn(),
  end: vi.fn(),
  sendDraft: vi.fn(),
  sendText: vi.fn(),
}));
vi.mock('@/features/business-registrations/voice/useLiveInterview', async () => {
  const React = await import('react');
  return {
    canTalkLive: () => true,
    useLiveInterview: (options: LiveOptions) => {
      const [active, setActive] = React.useState(false);
      live.options = options;
      live.setActive = setActive;
      return {
        status: active ? 'listening' : 'idle',
        captions: [{ id: 1, who: 'assistant', text: 'Cô bán món gì ạ?' }],
        notice: '',
        muted: false,
        pending: false,
        active,
        start: (...args: unknown[]) => {
          live.start(...args);
          setActive(true);
        },
        end: live.end,
        setMuted: vi.fn(),
        sendDraft: live.sendDraft,
        sendText: live.sendText,
        level: () => 0,
      };
    },
  };
});

const state = await import('@/features/business-registrations/voice/live-interview');
const { pickVietnameseVoice } = await import('@/features/business-registrations/voice/useReadAloud');
const { useVoiceSessionStore } = await import('@/features/business-registrations/voice/voice-session-store');
const { useNewRegistrationStore } = await import('@/features/business-registrations/new-registration-store');
const { VoiceRegistrationScreen } = await import('@/features/business-registrations/voice/VoiceRegistrationScreen');

const confirmCapital: AssistQuestion = {
  key: 'CONFIRM:capitalAmount',
  text: 'Ba mươi triệu đồng, đúng không ạ?',
  input: 'CONFIRM',
  choices: [
    { value: 'yes', label: 'Đúng rồi' },
    { value: 'no', label: 'Nói lại' },
  ],
  field: 'capitalAmount',
  skippable: false,
};

const result = (draft: AssistDraft, next: AssistQuestion | null): AssistTurnResult => ({
  transcript: 'vốn ba chục triệu',
  proposals: [],
  location: null,
  slotPreview: [],
  nextQuestion: next,
  warnings: [],
  done: next === null,
  isAiGenerated: true,
  draft,
});

function mount() {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/vendor/registrations/new/voice']}>
        <Routes>
          <Route path="/vendor/registrations/new/voice" element={<VoiceRegistrationScreen />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** A socket double: records what the link sends. */
function socket(readyState = 1) {
  return { readyState, sent: [] as (string | ArrayBuffer)[], send(data: string | ArrayBuffer) { this.sent.push(data); }, close: vi.fn() };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
  useNewRegistrationStore.getState().reset();
  useVoiceSessionStore.getState().clear();
});

afterEach(() => cleanup());

describe('live conversation protocol (shared with the app)', () => {
  it('a tap carries the version of the screen it was made on', () => {
    const s = socket();
    const onAssist = vi.fn();
    const link = new state.LiveInterviewLink(s, { onAssist, onEnded: vi.fn() });
    link.receive(JSON.stringify({ type: 'ready', sessionId: 's', maxSeconds: 600 }));
    link.receive(JSON.stringify({ type: 'assist', version: 3, cause: 'voice', result: result({ salutation: 'cô' }, confirmCapital) }));
    expect(onAssist).toHaveBeenCalledWith(expect.objectContaining({ nextQuestion: confirmCapital }), 'voice');

    link.sendDraft({ salutation: 'cô', confirmed: ['capitalAmount'] });
    expect(link.pending).toBe(true);
    expect(JSON.parse(s.sent.at(-1) as string)).toEqual({ type: 'draft', version: 3, draft: { salutation: 'cô', confirmed: ['capitalAmount'] } });
    link.receive(JSON.stringify({ type: 'assist', version: 4, cause: 'screen', result: result({ salutation: 'cô' }, null) }));
    expect(link.pending).toBe(false);
    link.close();
  });

  it('plays audio frames and keeps the microphone quiet while muted', () => {
    const s = socket();
    const onAudio = vi.fn();
    const onStatus = vi.fn();
    const link = new state.LiveInterviewLink(s, { onAssist: vi.fn(), onEnded: vi.fn(), onAudio, onStatus });
    const frame = new ArrayBuffer(8);
    new DataView(frame).setUint32(0, 2, true);
    link.receive(frame);
    expect(onAudio).toHaveBeenCalledWith(2, expect.any(Int16Array));

    link.setMuted(true);
    link.sendAudio(new ArrayBuffer(640));
    expect(s.sent.filter((d) => d instanceof ArrayBuffer)).toHaveLength(0);
    link.receive(JSON.stringify({ type: 'state', state: 'listening' }));
    expect(onStatus).toHaveBeenLastCalledWith('muted');
    link.close();
  });

  it('ends with the server reason, or by itself when the server is not ready in time', () => {
    vi.useFakeTimers();
    const slow = socket();
    const ended = vi.fn();
    new state.LiveInterviewLink(slow, { onAssist: vi.fn(), onEnded: ended });
    vi.advanceTimersByTime(state.READY_TIMEOUT_MS);
    expect(ended).toHaveBeenCalledWith('ready_timeout');
    expect(slow.close).toHaveBeenCalled();

    const busy = socket();
    const reasons: string[] = [];
    const link = new state.LiveInterviewLink(busy, { onAssist: vi.fn(), onEnded: (r) => reasons.push(r) });
    link.receive(JSON.stringify({ type: 'error', code: 'voice_unavailable', message: 'x' }));
    link.receive(JSON.stringify({ type: 'ended', reason: 'voice_unavailable' }));
    expect(reasons).toEqual(['voice_unavailable']);
  });

  it('starts a new caption line once a turn is over', () => {
    let captions = state.appendLiveCaption([], 'assistant', 'Cô bán món gì ạ?');
    captions = state.appendLiveCaption(captions, 'assistant', ' Mấy giờ ạ?');
    expect(captions).toHaveLength(1);
    captions = state.appendLiveCaption(state.closeLiveCaption(captions), 'assistant', 'Có phải chỗ này không?');
    expect(captions.map((c) => c.text)).toEqual(['Cô bán món gì ạ? Mấy giờ ạ?', 'Có phải chỗ này không?']);
  });

  it('tells the vendor what happened and that nothing they said is lost', () => {
    expect(state.fallbackNotice('voice_unavailable')).toContain('phần đã kể vẫn giữ');
    expect(state.fallbackNotice('voice_daily_limit')).toContain('hết thời lượng');
    expect(state.fallbackNotice('session_expired')).toContain('đăng nhập lại');
    expect(state.liveStreamUrl('https://api.example.test/api', 'https://web.test', '/hubs/registration-voice/abc', 't1', 'jwt')).toBe(
      'wss://api.example.test/hubs/registration-voice/abc?ticket=t1&access_token=jwt',
    );
  });
});

describe('device voice for tap-to-talk', () => {
  const voice = (name: string, lang: string) => ({ name, lang, localService: true });

  it('picks the most natural Vietnamese voice and never one of another language', () => {
    expect(
      pickVietnameseVoice([
        voice('Microsoft David - English (United States)', 'en-US'),
        voice('Microsoft An - Vietnamese (Vietnam)', 'vi-VN'),
        voice('Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)', 'vi-VN'),
      ])?.name,
    ).toBe('Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)');
    expect(pickVietnameseVoice([voice('Google tiếng Việt', 'vi_VN'), voice('Linh', 'vi-VN')])?.name).toBe('Google tiếng Việt');
    expect(pickVietnameseVoice([voice('Google US English', 'en-US'), voice('Samantha', 'en-US')])).toBeNull();
  });
});

describe('interview screen in conversation mode', () => {
  function startInterview() {
    useVoiceSessionStore.getState().start(true);
    useVoiceSessionStore.getState().setPhase('interview');
    useVoiceSessionStore.getState().setDraft({ salutation: 'cô' });
    mount();
  }

  it('starts with one tap, and a tap on the screen goes to the conversation, not to a new turn', () => {
    startInterview();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));
    expect(live.start).toHaveBeenCalledWith({ salutation: 'cô' }, true);
    expect(screen.getByText('[AI] Trợ lý')).toBeInTheDocument();

    act(() => live.options.onAssist(result({ salutation: 'cô', capitalAmount: 30_000_000 }, confirmCapital), 'voice'));
    expect(screen.getByText(confirmCapital.text)).toBeInTheDocument();
    expect(useVoiceSessionStore.getState().turns).toBe(1);

    fireEvent.click(screen.getByRole('button', { name: 'Đúng rồi' }));
    expect(live.sendDraft).toHaveBeenCalledWith(expect.objectContaining({ capitalAmount: 30_000_000, confirmed: ['capitalAmount'] }));
    expect(voiceApi.turn).not.toHaveBeenCalled();
    // Still only a draft: nothing reaches the wizard until "Đúng, nộp" (T3).
    expect(useNewRegistrationStore.getState().capitalAmount).toBe('');
  });

  it('falls back to tap-to-talk with the same draft when the conversation stops', () => {
    startInterview();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));
    const capital: AssistQuestion = { ...confirmCapital, key: 'CAPITAL', text: 'Vốn bỏ ra ban đầu khoảng bao nhiêu ạ?', input: 'VOICE', choices: [] };
    act(() => live.options.onAssist(result({ salutation: 'cô', businessLine: 'Bún bò' }, capital), 'voice'));

    act(() => {
      live.setActive(false);
      live.options.onStopped('voice_unavailable');
    });

    expect(screen.getByRole('status')).toHaveTextContent('phần đã kể vẫn giữ');
    expect(screen.getByRole('button', { name: 'Bấm để nói' })).toBeInTheDocument();
    expect(screen.getByText(capital.text)).toBeInTheDocument();
    expect(useVoiceSessionStore.getState().draft.businessLine).toBe('Bún bò');
    // The question is still there, so tap-to-talk does not need to ask the server again.
    expect(voiceApi.turn).not.toHaveBeenCalled();
  });

  it('the finished interview lets the assistant finish its sentence, then moves on to the photo', () => {
    startInterview();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu trò chuyện' }));
    act(() => live.options.onAssist(result({ salutation: 'cô', businessLine: 'Bún bò' }, null), 'voice'));
    expect(useVoiceSessionStore.getState().phase).toBe('interview');
    act(() => live.options.onTurnComplete?.());
    expect(useVoiceSessionStore.getState().phase).toBe('photos');
    expect(screen.getByText('Chụp xe hoặc quầy của bạn để phường dễ xét')).toBeInTheDocument();
  });
});
