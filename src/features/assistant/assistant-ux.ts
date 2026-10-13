import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { AssistantLocation, AssistantMessage, AssistantRole } from './types';

/**
 * Reveal streamed text at a steady pace instead of in network-sized bursts.
 * The speed adapts to the backlog so the display never falls far behind the server.
 */
export function useSmoothText(text: string, streaming: boolean) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(text);
  const target = useRef(text);
  target.current = text;
  useEffect(() => {
    if (!streaming || reduced) {
      setShown(text);
      return;
    }
    let frame = 0;
    const tick = () => {
      setShown((current) => {
        const goal = target.current;
        if (!goal.startsWith(current)) return goal;
        const backlog = goal.length - current.length;
        if (backlog <= 0) return current;
        return goal.slice(0, current.length + Math.max(2, Math.ceil(backlog / 10)));
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [streaming, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  return streaming && !reduced ? shown : text;
}

/** Markdown to something a speech engine reads naturally. */
export function speakable(markdown: string) {
  return markdown
    .replace(/\[AI\]/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>|~]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Browser text-to-speech for a single answer (F19). Nothing is sent to a server. */
export function useReadAloud() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState<string>();
  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);
  const toggle = useCallback(
    (id: string, text: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      if (speaking === id) {
        setSpeaking(undefined);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(speakable(text));
      utterance.lang = 'vi-VN';
      const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'));
      if (voice) utterance.voice = voice;
      utterance.rate = 1;
      utterance.onend = utterance.onerror = () => setSpeaking((current) => (current === id ? undefined : current));
      setSpeaking(id);
      synth.speak(utterance);
    },
    [speaking, supported],
  );
  return { supported, speaking, toggle };
}

/** Deterministic follow-ups from what was looked up; they are only question text, never actions. */
export function followUps(message: AssistantMessage, role: AssistantRole): string[] {
  if (message.status !== 'COMPLETED' || message.sender !== 'ASSISTANT') return [];
  const tools = new Set(message.sources.map((s) => s.id.split(':')[1]).filter(Boolean));
  const image = message.sources.some((s) => s.kind === 'IMAGE_ANALYSIS');
  const out: string[] = [];
  if (role === 'CUSTOMER' && (tools.has('public.food') || image))
    out.push('Quầy nào đang mở cửa?', 'Làm sao kiểm tra giấy phép của quầy?');
  if (tools.has('vendor.finance') || tools.has('vendor.fees') || tools.has('vendor.penalties'))
    out.push('Khoản nào sắp đến hạn?', 'Xem lịch sử thanh toán của tôi');
  if (tools.has('vendor.contracts') || tools.has('vendor.contract'))
    out.push('Giấy phép của tôi còn hiệu lực không?', 'Làm sao gia hạn hợp đồng?');
  if (tools.has('vendor.registrations') || tools.has('vendor.registration'))
    out.push('Hồ sơ của tôi cần bổ sung gì?', 'Đăng ký xong thì thuê ô thế nào?');
  if (tools.has('ward.dashboard')) out.push('Hồ sơ nào đang chờ xử lý?', 'Giải thích báo cáo thu của phường');
  if (tools.has('ward.slot_permit')) out.push('Quy trình xử lý khi giấy phép tạm đình chỉ?');
  return out.slice(0, 3);
}

export function requestLocation(): Promise<AssistantLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Thiết bị không hỗ trợ định vị.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => reject(new Error('Chưa có quyền vị trí. Bạn vẫn có thể tìm theo khu vực.')),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 },
    );
  });
}

export function distanceMeters(a: AssistantLocation, b: AssistantLocation) {
  const r = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

export function distanceLabel(meters: number | null | undefined) {
  if (meters == null) return undefined;
  if (meters < 1000) return `~${Math.max(50, Math.round(meters / 50) * 50)} m`;
  return `~${(meters / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`;
}

/** Per-account conveniences only (never business state); storage can be unavailable. */
export function usePreference(key: string, fallback: boolean) {
  const read = () => {
    try {
      const value = window.localStorage.getItem(key);
      return value === null ? fallback : value === '1';
    } catch {
      return fallback;
    }
  };
  const [value, setValue] = useState(read);
  const update = useCallback(
    (next: boolean) => {
      setValue(next);
      try {
        window.localStorage.setItem(key, next ? '1' : '0');
      } catch {
        // Private mode: keep the choice for this session only.
      }
    },
    [key],
  );
  return [value, update] as const;
}

export function greeting(now = new Date()) {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }).format(now),
  );
  return hour < 11 ? 'Chào buổi sáng' : hour < 14 ? 'Chào buổi trưa' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
}
