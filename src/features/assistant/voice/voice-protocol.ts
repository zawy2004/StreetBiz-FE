import type { AssistantAction, AssistantCard, AssistantMessage, AssistantSource } from '../types';

export type VoiceState =
  | 'idle'
  | 'requesting'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'muted'
  | 'reconnecting'
  | 'ending'
  | 'ended'
  | 'error';

export type Caption = { id: number; who: 'user' | 'assistant'; text: string };
export type VoiceToolResult = {
  id: string;
  source: AssistantSource;
  cards: AssistantCard[];
  actions: AssistantAction[];
};

export type VoiceServerEvent =
  | { type: 'state'; state: string; generation?: number }
  | { type: 'ready'; sessionId: string; conversationId: string; maxSeconds: number }
  | { type: 'input_transcript' | 'output_transcript'; text: string; generation: number }
  | { type: 'interrupted' | 'turn_complete'; generation: number }
  | { type: 'tool'; status: 'running' | 'done' | 'failed'; id: string; label?: string } & Partial<VoiceToolResult>
  | { type: 'turn_saved'; userMessage: AssistantMessage; message: AssistantMessage }
  | { type: 'warning'; code: string; secondsLeft?: number; message?: string }
  | { type: 'error'; code: string; message: string }
  | { type: 'ended'; reason: string; summary?: VoiceSummary | null };

export type VoiceSummary = {
  seconds: number;
  turns: number;
  replyMedianMs: number | null;
  replyP95Ms: number | null;
  inputTokens: number;
  outputTokens: number;
  reconnects: number;
};

/** One honest line about the finished session; the reply time is measured by the server. */
export function summaryLine(summary: VoiceSummary) {
  const parts = [`Phiên ${formatClock(summary.seconds)}`, `${summary.turns} lượt`];
  if (summary.replyMedianMs != null)
    parts.push(`phản hồi ~${(summary.replyMedianMs / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} giây`);
  return parts.join(' · ');
}

export const STATE_LABEL: Record<VoiceState, string> = {
  idle: 'Sẵn sàng',
  requesting: 'Đang xin quyền micro…',
  connecting: 'Đang kết nối…',
  listening: 'Đang nghe',
  thinking: 'Đang tra cứu',
  speaking: 'Đang trả lời',
  muted: 'Đã tắt micro',
  reconnecting: 'Đang kết nối lại…',
  ending: 'Đang kết thúc…',
  ended: 'Đã kết thúc',
  error: 'Chưa thể trò chuyện',
};

export const END_REASON: Record<string, string> = {
  ended: 'Cuộc trò chuyện đã kết thúc.',
  time_limit: 'Đã hết thời lượng của phiên giọng nói.',
  idle: 'Phiên đã dừng vì không nghe thấy bạn nói.',
  session_expired: 'Phiên đăng nhập đã hết hiệu lực.',
  disconnected: 'Mất kết nối với trợ lý.',
  provider_reconnect: 'Dịch vụ giọng nói cần kết nối lại. Hãy bắt đầu phiên mới.',
  provider_closed: 'Dịch vụ giọng nói đã đóng kết nối.',
  provider_error: 'Dịch vụ giọng nói gặp lỗi.',
  invalid_audio: 'Âm thanh gửi lên không hợp lệ.',
  audio_rate: 'Âm thanh gửi lên quá nhanh.',
  hidden: 'Phiên đã dừng khi bạn rời khỏi trang.',
};

/** Server audio frames are [uint32 generation, little-endian][PCM16 mono]. */
export function parseAudioFrame(data: ArrayBuffer): { generation: number; pcm: Int16Array } | null {
  if (data.byteLength < 6 || (data.byteLength - 4) % 2 !== 0) return null;
  const generation = new DataView(data).getUint32(0, true);
  return { generation, pcm: new Int16Array(data.slice(4)) };
}

export function pcm16ToFloat32(pcm: Int16Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = pcm[i]! / (pcm[i]! < 0 ? 0x8000 : 0x7fff);
  return out;
}

/** Streaming transcripts arrive in fragments; consecutive fragments from the same speaker extend one caption. */
export function appendCaption(captions: Caption[], who: Caption['who'], text: string, max = 6): Caption[] {
  if (!text) return captions;
  const last = captions.at(-1);
  if (last && last.who === who) return [...captions.slice(0, -1), { ...last, text: last.text + text }];
  return [...captions, { id: (last?.id ?? 0) + 1, who, text: text.trimStart() }].slice(-max);
}

/** Hub paths sit beside /api; the browser authenticates the upgrade with access_token like SignalR. */
export function voiceStreamUrl(apiBaseUrl: string, origin: string, streamPath: string, ticket: string, accessToken: string) {
  const base = new URL(apiBaseUrl, origin);
  const url = new URL(base.toString());
  url.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${base.pathname.replace(/\/$/, '').replace(/\/api$/, '')}${streamPath}`;
  url.search = new URLSearchParams({ ticket, access_token: accessToken }).toString();
  url.hash = '';
  return url.toString();
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
