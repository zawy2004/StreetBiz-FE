import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { optimistic } from '@/features/assistant/assistant-state';
import { distanceLabel, followUps, speakable } from '@/features/assistant/assistant-ux';
import type { AssistantAction, AssistantCard, AssistantMessage } from '@/features/assistant/types';
import {
  appendCaption,
  parseAudioFrame,
  pcm16ToFloat32,
  voiceStreamUrl,
} from '@/features/assistant/voice/voice-protocol';
import { VoicePlayer } from '@/features/assistant/voice/voice-player';

const mock = vi.hoisted(() => ({ briefing: vi.fn(), capabilities: {} as Record<string, unknown> }));
vi.mock('@/core/config/env', () => ({ isLiveApi: true, env: { apiBaseUrl: 'http://localhost:5000/api' } }));
vi.mock('@/core/api/asset-url', () => ({ apiAssetUrl: (url: string) => url }));
vi.mock('@/features/assistant/assistant-api', () => ({ assistantApi: { briefing: mock.briefing } }));
vi.mock('@/features/assistant/useAssistant', () => ({
  useAssistant: () => ({
    messages: [],
    conversations: [],
    trail: [],
    busy: false,
    error: '',
    connected: true,
    capabilities: mock.capabilities,
    send: vi.fn(),
    select: vi.fn(),
    loadConversations: vi.fn(),
  }),
}));
const { AssistantPanel, MessageBubble } = await import('@/features/assistant/AssistantPanel');
const { DishCandidates } = await import('@/features/assistant/DishCandidates');
const { AssistantVendorResults } = await import('@/features/assistant/AssistantVendorResults');

beforeEach(() => {
  vi.clearAllMocks();
  mock.capabilities = { enabled: true, attachmentsEnabled: true, maxQuestionCharacters: 4000, retentionDays: 30 };
  mock.briefing.mockResolvedValue({ observedAt: '2026-10-09T08:00:00+07:00', items: [] });
  try {
    window.localStorage.clear();
  } catch {
    // ignore
  }
});
afterEach(cleanup);

const answer = (patch: Partial<AssistantMessage>): AssistantMessage => ({
  ...optimistic('', 'request', 2),
  id: 'answer',
  sender: 'ASSISTANT',
  status: 'COMPLETED',
  isAiGenerated: true,
  ...patch,
});
const bubble = (message: AssistantMessage, extra: Record<string, unknown> = {}) =>
  render(
    <MessageBubble
      message={message}
      role="CUSTOMER"
      busy={false}
      onNavigate={vi.fn()}
      onRetry={vi.fn()}
      onFeedback={vi.fn()}
      {...extra}
    />,
  );

describe('voice protocol', () => {
  it('splits generation-tagged audio frames and rejects malformed ones', () => {
    const buffer = new ArrayBuffer(8);
    new DataView(buffer).setUint32(0, 7, true);
    new DataView(buffer).setInt16(4, -32768, true);
    new DataView(buffer).setInt16(6, 32767, true);
    const frame = parseAudioFrame(buffer)!;
    expect(frame.generation).toBe(7);
    expect(Array.from(pcm16ToFloat32(frame.pcm))).toEqual([-1, 1]);
    expect(parseAudioFrame(new ArrayBuffer(5))).toBeNull();
  });
  it('merges streaming caption fragments per speaker and keeps only recent lines', () => {
    let c = appendCaption([], 'user', 'Phí ');
    c = appendCaption(c, 'user', 'tháng này');
    c = appendCaption(c, 'assistant', ' Bạn cần trả');
    expect(c.map((x) => [x.who, x.text])).toEqual([
      ['user', 'Phí tháng này'],
      ['assistant', 'Bạn cần trả'],
    ]);
    for (let i = 0; i < 10; i++) c = appendCaption(c, i % 2 ? 'user' : 'assistant', `${i}`);
    expect(c).toHaveLength(6);
  });
  it('builds the authenticated hub URL beside /api with ws or wss', () => {
    const url = new URL(voiceStreamUrl('https://api.streetbiz.vn/api', 'https://app.streetbiz.vn', '/hubs/chatbot-voice/abc', 't1', 'jwt'));
    expect(url.protocol).toBe('wss:');
    expect(url.pathname).toBe('/hubs/chatbot-voice/abc');
    expect(url.searchParams.get('ticket')).toBe('t1');
    expect(url.searchParams.get('access_token')).toBe('jwt');
    expect(voiceStreamUrl('/api', 'http://localhost:5173', '/hubs/x', 'a', 'b')).toMatch(/^ws:\/\/localhost:5173\/hubs\/x\?/);
  });
  it('stops scheduled audio of an interrupted generation and ignores its late chunks', () => {
    const started: { stop: ReturnType<typeof vi.fn> }[] = [];
    const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
    const context = {
      currentTime: 0,
      destination: {},
      createGain: node,
      createAnalyser: () => ({ ...node(), fftSize: 0, getByteTimeDomainData: vi.fn() }),
      createBuffer: (_: number, length: number, rate: number) => ({ duration: length / rate, copyToChannel: vi.fn() }),
      createBufferSource: () => {
        const source = { ...node(), buffer: null, start: vi.fn(), stop: vi.fn(), onended: null };
        started.push(source);
        return source;
      },
    } as unknown as AudioContext;
    const player = new VoicePlayer(context);
    player.enqueue(1, new Int16Array(240));
    player.enqueue(1, new Int16Array(240));
    player.interrupt(1);
    expect(started.every((s) => s.stop.mock.calls.length === 1)).toBe(true);
    player.enqueue(1, new Int16Array(240));
    expect(started).toHaveLength(2);
    player.enqueue(2, new Int16Array(240));
    expect(started).toHaveLength(3);
    expect(player.playing).toBe(true);
  });
});

describe('answer presentation', () => {
  it('offers follow-ups from what was looked up and asks them as new questions', async () => {
    const onAsk = vi.fn();
    const message = answer({
      content: 'Tìm thấy 2 quầy.',
      sources: [{ id: 'live:public.food:1', title: 'Tìm món', kind: 'LIVE_DATA', observedAt: '2026-10-09T10:30:00+07:00', documentVersion: null, actionId: null }],
    });
    bubble(message, { onAsk });
    await userEvent.click(screen.getByRole('button', { name: 'Quầy nào đang mở cửa?' }));
    expect(onAsk).toHaveBeenCalledWith('Quầy nào đang mở cửa?');
    expect(screen.getByText('Dữ liệu trực tiếp')).toBeVisible();
    expect(followUps({ ...message, status: 'FAILED' }, 'CUSTOMER')).toEqual([]);
  });
  it('reads an answer aloud with the browser voice and can stop it', async () => {
    const toggle = vi.fn();
    bubble(answer({ content: '**Phí** tháng này' }), { readAloud: { supported: true, toggle } });
    await userEvent.click(screen.getByRole('button', { name: 'Đọc to câu trả lời' }));
    expect(toggle).toHaveBeenCalledWith('answer', '**Phí** tháng này');
    expect(speakable('## Tổng\n- **350.000 ₫** [AI]\n[Mở](x)')).toBe('Tổng. 350.000 ₫. Mở');
  });
  it('marks spoken turns', () => {
    render(
      <MessageBubble
        message={{ ...optimistic('Phí của tôi', 'r', 1), channel: 'VOICE' }}
        role="VENDOR"
        busy={false}
        onNavigate={vi.fn()}
        onRetry={vi.fn()}
        onFeedback={vi.fn()}
      />,
    );
    expect(screen.getByText('Nói bằng giọng')).toBeVisible();
  });
  it('shows photo candidates with wording confidence and lets the user correct the dish', async () => {
    const onAsk = vi.fn();
    const card: AssistantCard = {
      kind: 'dish_match',
      title: 'Món trong ảnh có thể là',
      actionId: null,
      fields: [
        { label: 'bún riêu', value: 'Có thể' },
        { label: 'bún bò', value: 'Chưa chắc' },
        { label: 'Dấu hiệu nhận thấy', value: 'Nước dùng đỏ' },
      ],
    };
    render(<DishCandidates card={card} disabled={false} onAsk={onAsk} />);
    expect(screen.getByText(/chưa xác minh/)).toBeVisible();
    expect(screen.getByText('Nước dùng đỏ')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /bún bò/ }));
    expect(onAsk).toHaveBeenLastCalledWith('Tìm quán bán bún bò');
    await userEvent.click(screen.getByRole('button', { name: /Không phải món này/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Tên món đúng' }), 'canh bún');
    await userEvent.click(screen.getByRole('button', { name: /Tìm quán/ }));
    expect(onAsk).toHaveBeenLastCalledWith('Tìm quán bán canh bún');
  });
});

describe('stall results v2', () => {
  const stall = (id: number, open: boolean, price: number): AssistantCard => ({
    kind: 'status',
    title: `Quầy ${id}`,
    actionId: `public.food:${id}`,
    imageUrl: null,
    fields: [{ label: 'Món niêm yết', value: 'Bún chả' }],
    place: { latitude: 16.06 + id / 1000, longitude: 108.22, distanceMeters: id * 300, isOpenNow: open, rating: 4.5, ratingCount: 9, priceVnd: price },
  });
  const act = (id: number): AssistantAction => ({ id: `public.food:${id}`, label: 'Mở', kind: 'NAVIGATE', route: `/customer/explore/stores/${id}` });
  const names = () => screen.getAllByRole('button', { name: /^Xem nhanh Quầy/ }).map((b) => b.getAttribute('aria-label'));

  it('sorts by open now, distance and price without another request', async () => {
    render(<AssistantVendorResults cards={[stall(1, false, 40000), stall(2, true, 50000), stall(3, true, 30000)]} actions={[act(1), act(2), act(3)]} onNavigate={vi.fn()} />);
    expect(names()).toEqual(['Xem nhanh Quầy 1', 'Xem nhanh Quầy 2', 'Xem nhanh Quầy 3']);
    await userEvent.click(screen.getByRole('button', { name: 'Đang mở' }));
    expect(names()[2]).toBe('Xem nhanh Quầy 1');
    await userEvent.click(screen.getByRole('button', { name: 'Giá thấp' }));
    expect(names()[0]).toBe('Xem nhanh Quầy 3');
    await userEvent.click(screen.getByRole('button', { name: 'Gần nhất' }));
    expect(names()[0]).toBe('Xem nhanh Quầy 1');
    expect(screen.getAllByText('Đang mở').length).toBeGreaterThan(1);
    expect(screen.getByText('~300 m')).toBeVisible();
  });
  it('offers directions to the public stall position in the quick preview', async () => {
    HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
      this.setAttribute('open', '');
    };
    HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
      this.removeAttribute('open');
    };
    render(<AssistantVendorResults cards={[stall(2, true, 50000)]} actions={[act(2)]} onNavigate={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Xem nhanh Quầy 2' }));
    const link = within(screen.getByRole('dialog')).getByRole('link', { name: /Chỉ đường/ });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/www\.google\.com\/maps\/dir\/\?api=1&destination=16\.06\d*,108\.22$/);
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
  it('labels distances approximately', () => {
    expect(distanceLabel(12)).toBe('~50 m');
    expect(distanceLabel(1260)).toBe('~1,3 km');
    expect(distanceLabel(null)).toBeUndefined();
  });
});

describe('voice mode results', () => {
  const voice = (results: unknown[]) =>
    ({
      state: 'speaking',
      captions: [{ id: 1, who: 'user', text: 'Có bánh mì không?' }],
      results,
      activity: '',
      notice: '',
      error: '',
      secondsLeft: 280,
      muted: false,
      active: true,
      start: vi.fn(),
      end: vi.fn(),
      setMuted: vi.fn(),
      level: () => 0,
      reset: vi.fn(),
    }) as never;
  const source = { id: 's', title: 't', kind: 'LIVE_DATA', observedAt: null, documentVersion: null, actionId: null };
  const food = (id: number, dish: string): AssistantCard => ({
    kind: 'status',
    title: `Quầy ${id}`,
    actionId: `public.food:${id}`,
    imageUrl: null,
    fields: [
      { label: 'Món niêm yết', value: dish },
      { label: 'Giá niêm yết', value: '25.000 VND' },
    ],
    place: { latitude: 16, longitude: 108, distanceMeters: null, isOpenNow: true, rating: null, ratingCount: 0, priceVnd: 25000 },
  });
  const action = (id: number): AssistantAction => ({ id: `public.food:${id}`, label: 'Mở', kind: 'NAVIGATE', route: `/customer/explore/stores/${id}` });

  it('shows stalls as one photo card per stall from the latest lookup, with controls still reachable', async () => {
    const { VoiceMode } = await import('@/features/assistant/VoiceMode');
    const results = [
      { id: 'old', source, cards: [food(9, 'Phở')], actions: [action(9)] },
      { id: 'new', source, cards: [food(1, 'Bánh mì chả cá'), food(1, 'Bánh mì thịt nướng'), food(2, 'Bánh mì')], actions: [action(1), action(2)] },
    ];
    render(
      <VoiceMode voice={voice(results)} role="CUSTOMER" consented onConsent={vi.fn()} onStart={vi.fn()} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    const stalls = screen.getAllByRole('button', { name: /^Xem nhanh Quầy/ });
    expect(stalls.map((b) => b.getAttribute('aria-label'))).toEqual(['Xem nhanh Quầy 1', 'Xem nhanh Quầy 2']);
    expect(within(stalls[0]!).getByText('Bánh mì chả cá · Bánh mì thịt nướng')).toBeVisible();
    expect(within(stalls[0]!).getByRole('img')).toHaveAttribute('alt', expect.stringContaining('Ảnh minh họa'));
    expect(within(stalls[1]!).getByText('25.000 ₫')).toBeVisible();
    expect(screen.queryByText('Quầy 9')).not.toBeInTheDocument();
    expect(screen.queryByText('Món niêm yết')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Kết thúc trò chuyện' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Tắt micro' })).toBeVisible();
  });
  it('shows reconnecting as text and the measured session summary after the end', async () => {
    const { VoiceMode } = await import('@/features/assistant/VoiceMode');
    const base = voice([]) as unknown as Record<string, unknown>;
    const { rerender } = render(
      <VoiceMode voice={{ ...base, state: 'reconnecting' } as never} role="CUSTOMER" consented onConsent={vi.fn()} onStart={vi.fn()} onClose={vi.fn()} onNavigate={vi.fn()} />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Đang kết nối lại…');
    rerender(
      <VoiceMode
        voice={{ ...base, state: 'ended', active: false, summary: { seconds: 133, turns: 4, replyMedianMs: 1200, replyP95Ms: 2100, inputTokens: 1, outputTokens: 1, reconnects: 0 } } as never}
        role="CUSTOMER"
        consented
        onConsent={vi.fn()}
        onStart={vi.fn()}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText('Phiên 2:13 · 4 lượt · phản hồi ~1,2 giây')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Bắt đầu nói lại' })).toBeVisible();
  });
  it('summarises other live data without technical rows', async () => {
    const { VoiceMode } = await import('@/features/assistant/VoiceMode');
    const card: AssistantCard = {
      kind: 'status',
      title: 'Tài chính của bạn',
      actionId: 'vendor.finance:1:0',
      fields: [
        { label: 'Tổng phải trả', value: '500.000 VND' },
        { label: 'Lưu ý', value: 'x' },
      ],
    };
    render(
      <VoiceMode
        voice={voice([{ id: 'f', source, cards: [card], actions: [{ id: 'vendor.finance:1:0', label: 'Mở chi tiết', kind: 'NAVIGATE', route: '/vendor/finance' }] }])}
        role="VENDOR"
        consented
        onConsent={vi.fn()}
        onStart={vi.fn()}
        onClose={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    expect(screen.getByText('500.000 VND')).toBeVisible();
    expect(screen.queryByText('Lưu ý')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mở chi tiết/ })).toBeVisible();
  });
});

describe('panel v2', () => {
  const panel = (role: 'VENDOR' | 'CUSTOMER') =>
    render(
      <MemoryRouter>
        <AssistantPanel accountKey={role} role={role} open fullPage={false} onClose={vi.fn()} />
      </MemoryRouter>,
    );
  it('shows the read-only vendor briefing with role-safe actions', async () => {
    mock.briefing.mockResolvedValue({
      observedAt: '2026-10-09T08:00:00+07:00',
      items: [
        { tone: 'warning', title: '1 khoản đã quá hạn', detail: 'Tổng phải trả 500.000 ₫.', action: { id: 'f', label: 'Mở Tài chính', kind: 'NAVIGATE', route: '/vendor/finance' } },
        { tone: 'info', title: 'Lạ', detail: 'x', action: { id: 'x', label: 'Quản trị', kind: 'NAVIGATE', route: '/platform/accounts' } },
      ],
    });
    panel('VENDOR');
    const section = await screen.findByRole('region', { name: 'Việc cần làm hôm nay' });
    expect(within(section).getByText('1 khoản đã quá hạn')).toBeVisible();
    expect(within(section).getByRole('button', { name: /Mở Tài chính/ })).toBeVisible();
    expect(within(section).queryByRole('button', { name: /Quản trị/ })).not.toBeInTheDocument();
  });
  it('turns the send button into voice when enabled, and asks for voice consent before the mic', async () => {
    mock.capabilities = { ...mock.capabilities, voiceEnabled: true };
    panel('CUSTOMER');
    expect(screen.queryByRole('button', { name: 'Gửi câu hỏi' })).not.toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Trò chuyện bằng giọng nói' }).at(-1)!);
    expect(screen.getByText(/không lưu bản ghi âm/)).toBeVisible();
    expect(screen.getByRole('button', { name: /Bắt đầu nói/ })).toBeVisible();
    await userEvent.type(screen.getByRole('textbox', { name: 'Câu hỏi cho Trợ lý StreetBiz' }), 'a');
    expect(screen.getByRole('button', { name: 'Gửi câu hỏi' })).toBeEnabled();
  });
  it('lets the user remember photo consent and revoke it from the menu', async () => {
    const user = userEvent.setup();
    window.localStorage.setItem('sb-assistant-photo-consent:CUSTOMER', '1');
    panel('CUSTOMER');
    await user.click(screen.getByRole('button', { name: 'Tùy chọn khác' }));
    await user.click(screen.getByRole('menuitem', { name: /Thu hồi đồng ý gửi ảnh/ }));
    await waitFor(() => expect(window.localStorage.getItem('sb-assistant-photo-consent:CUSTOMER')).toBe('0'));
  });
});
