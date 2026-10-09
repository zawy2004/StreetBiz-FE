import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '@/core/api/token-storage';
import { errorMessage } from '@/core/api/problem';
import { env } from '@/core/config/env';
import { assistantApi } from '../assistant-api';
import type { AssistantLocation, AssistantMessage } from '../types';
// A same-origin file, not an inlined data: URL, so audioWorklet.addModule works under a strict CSP.
import workletUrl from './capture.worklet.js?url&no-inline';
import { VoicePlayer } from './voice-player';
import {
  appendCaption,
  END_REASON,
  parseAudioFrame,
  voiceStreamUrl,
  type Caption,
  type VoiceServerEvent,
  type VoiceState,
  type VoiceSummary,
  type VoiceToolResult,
} from './voice-protocol';

type Options = {
  onReady?: (conversationId: string) => void;
  onTurnSaved?: (conversationId: string, messages: AssistantMessage[]) => void;
  onEnded?: (conversationId?: string) => void;
};

/** One live voice session. Audio is never stored on the device; everything stops on end, unmount or a hidden tab. */
export function useVoiceSession({ onReady, onTurnSaved, onEnded }: Options = {}) {
  const [state, setState] = useState<VoiceState>('idle');
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [results, setResults] = useState<VoiceToolResult[]>([]);
  const [activity, setActivity] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState<number>();
  const [muted, setMutedState] = useState(false);
  const socket = useRef<WebSocket | undefined>(undefined);
  const context = useRef<AudioContext | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const player = useRef<VoicePlayer | undefined>(undefined);
  const micLevel = useRef(0);
  const mutedRef = useRef(false);
  const deadline = useRef(0);
  const conversation = useRef<string | undefined>(undefined);
  const [summary, setSummary] = useState<VoiceSummary>();
  const callbacks = useRef({ onReady, onTurnSaved, onEnded });
  callbacks.current = { onReady, onTurnSaved, onEnded };

  const teardown = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
    player.current?.dispose();
    player.current = undefined;
    void context.current?.close().catch(() => undefined);
    context.current = undefined;
    const ws = socket.current;
    socket.current = undefined;
    if (ws && ws.readyState <= WebSocket.OPEN) ws.close(1000, 'ended');
    micLevel.current = 0;
  }, []);

  const finish = useCallback(
    (reason: string) => {
      teardown();
      setState((current) => (current === 'error' ? current : 'ended'));
      setSecondsLeft(undefined);
      setActivity('');
      if (reason !== 'ended') setNotice(END_REASON[reason] ?? 'Phiên giọng nói đã dừng.');
      callbacks.current.onEnded?.(conversation.current);
    },
    [teardown],
  );

  const handle = useCallback(
    (event: VoiceServerEvent) => {
      switch (event.type) {
        case 'ready':
          conversation.current = event.conversationId;
          deadline.current = Date.now() + event.maxSeconds * 1000;
          setSecondsLeft(event.maxSeconds);
          callbacks.current.onReady?.(event.conversationId);
          break;
        case 'state':
          if (event.state === 'listening' && mutedRef.current) setState('muted');
          else if (['listening', 'thinking', 'speaking', 'muted', 'connecting', 'reconnecting'].includes(event.state))
            setState(event.state as VoiceState);
          if (event.state === 'reconnecting') setNotice('Kết nối với dịch vụ giọng nói bị gián đoạn, đang nối lại cùng cuộc trò chuyện…');
          else if (event.state === 'listening') setNotice((n) => (n.startsWith('Kết nối với dịch vụ') ? '' : n));
          if (event.state !== 'thinking') setActivity('');
          break;
        case 'input_transcript':
          setCaptions((c) => appendCaption(c, 'user', event.text));
          break;
        case 'output_transcript':
          setCaptions((c) => appendCaption(c, 'assistant', event.text));
          break;
        case 'interrupted':
          player.current?.interrupt(event.generation);
          break;
        case 'tool':
          if (event.status === 'running') setActivity(event.label ?? 'Đang tra cứu…');
          if (event.status === 'done' && event.source)
            setResults((r) => [
              ...r,
              { id: event.id, source: event.source!, cards: event.cards ?? [], actions: event.actions ?? [] },
            ]);
          if (event.status !== 'running') setActivity('');
          break;
        case 'turn_saved':
          if (conversation.current)
            callbacks.current.onTurnSaved?.(conversation.current, [event.userMessage, event.message].filter(Boolean));
          break;
        case 'warning':
          setNotice(
            event.code === 'time_limit'
              ? `Phiên giọng nói sẽ kết thúc sau ${event.secondsLeft ?? 30} giây.`
              : event.code === 'idle'
                ? 'Mình chưa nghe thấy bạn. Phiên sẽ tự dừng nếu bạn không nói tiếp.'
                : (event.message ?? ''),
          );
          break;
        case 'error':
          setError(event.message);
          setState('error');
          break;
        case 'ended':
          if (event.summary) setSummary(event.summary);
          finish(event.reason);
          break;
      }
    },
    [finish],
  );

  const start = useCallback(
    async (location?: AssistantLocation, simple = false) => {
      if (socket.current) return;
      setError('');
      setNotice('');
      setCaptions([]);
      setResults([]);
      setSummary(undefined);
      setMutedState(false);
      mutedRef.current = false;
      if (!navigator.mediaDevices?.getUserMedia || typeof AudioWorkletNode === 'undefined') {
        setError('Trình duyệt này chưa hỗ trợ trò chuyện bằng giọng nói. Hãy dùng Chrome, Edge hoặc Safari mới.');
        setState('error');
        return;
      }
      // Create the AudioContext inside the user gesture so iOS/Safari allow playback.
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      context.current = ctx;
      setState('requesting');
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
      } catch {
        teardown();
        setError(
          'Chưa có quyền dùng micro. Hãy cho phép micro cho trang này trong cài đặt trình duyệt, rồi thử lại.',
        );
        setState('error');
        return;
      }
      setState('connecting');
      try {
        await ctx.resume();
        await ctx.audioWorklet.addModule(workletUrl);
        const session = await assistantApi.startVoice(location, simple);
        if (context.current !== ctx) return;
        player.current = new VoicePlayer(ctx, session.outputSampleRate);
        const ws = new WebSocket(
          voiceStreamUrl(env.apiBaseUrl, window.location.origin, session.streamPath, session.ticket, getAccessToken() ?? ''),
        );
        ws.binaryType = 'arraybuffer';
        socket.current = ws;
        const capture = new AudioWorkletNode(ctx, 'streetbiz-capture', { numberOfInputs: 1, numberOfOutputs: 1 });
        // Keep the capture node in the rendered graph without playing the mic back.
        const silent = ctx.createGain();
        silent.gain.value = 0;
        capture.connect(silent).connect(ctx.destination);
        capture.port.onmessage = (message: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
          micLevel.current = mutedRef.current ? 0 : message.data.level;
          if (!mutedRef.current && ws.readyState === WebSocket.OPEN) ws.send(message.data.pcm);
        };
        ctx.createMediaStreamSource(stream.current).connect(capture);
        ws.onmessage = (message) => {
          if (message.data instanceof ArrayBuffer) {
            const frame = parseAudioFrame(message.data);
            if (frame) player.current?.enqueue(frame.generation, frame.pcm);
            return;
          }
          try {
            handle(JSON.parse(message.data as string) as VoiceServerEvent);
          } catch {
            // Ignore malformed control messages.
          }
        };
        ws.onclose = () => {
          if (socket.current === ws) finish('disconnected');
        };
      } catch (e) {
        teardown();
        setError(errorMessage(e));
        setState('error');
      }
    },
    [finish, handle, teardown],
  );

  const end = useCallback(() => {
    const ws = socket.current;
    if (!ws) return;
    setState('ending');
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'end' }));
    // The server answers with "ended"; do not keep the mic open if it never does.
    setTimeout(() => {
      if (socket.current === ws) finish('ended');
    }, 1500);
  }, [finish]);

  const setMuted = useCallback((value: boolean) => {
    mutedRef.current = value;
    setMutedState(value);
    stream.current?.getAudioTracks().forEach((track) => (track.enabled = !value));
    if (socket.current?.readyState === WebSocket.OPEN)
      socket.current.send(JSON.stringify({ type: 'mute', muted: value }));
  }, []);

  useEffect(() => {
    if (secondsLeft === undefined) return;
    const timer = setInterval(() => setSecondsLeft(Math.max(0, Math.round((deadline.current - Date.now()) / 1000))), 1000);
    return () => clearInterval(timer);
  }, [secondsLeft === undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      clearTimeout(hiddenTimer);
      if (document.visibilityState === 'hidden' && socket.current)
        hiddenTimer = setTimeout(() => {
          if (socket.current) finish('hidden');
        }, 30_000);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(hiddenTimer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [finish]);

  useEffect(() => teardown, [teardown]);

  const level = useCallback(() => {
    const out = player.current?.playing ? player.current.level() : 0;
    return Math.min(1, Math.max(out * 2.5, micLevel.current * 4));
  }, []);

  return {
    state,
    captions,
    results,
    activity,
    notice,
    error,
    secondsLeft,
    muted,
    summary,
    active: !['idle', 'ended', 'error'].includes(state),
    start,
    end,
    setMuted,
    level,
    reset: () => {
      teardown();
      setState('idle');
      setError('');
      setNotice('');
      setCaptions([]);
      setResults([]);
      setSummary(undefined);
    },
  };
}
