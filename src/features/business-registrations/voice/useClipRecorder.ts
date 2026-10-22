import { useCallback, useEffect, useRef, useState } from 'react';

// Same capture worklet as the voice assistant: a same-origin file so addModule works under a
// strict CSP; it posts 40 ms frames of 16 kHz mono PCM16 with their level.
import workletUrl from '@/features/assistant/voice/capture.worklet.js?url&no-inline';
import { encodeWav, framesDuration } from './wav';

export type ClipRecorderState = 'idle' | 'requesting' | 'recording' | 'error';

/** Shorter than this is a stray tap, not an answer. */
const MIN_SECONDS = 0.5;

/**
 * Records one answer: tap to start, tap to stop, or it stops by itself at `maxSeconds`. The clip
 * goes to `onClip` as a WAV blob (null when it was too short) and is never stored anywhere.
 */
export function useClipRecorder(onClip: (clip: Blob | null) => void, maxSeconds = 30) {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof AudioWorkletNode !== 'undefined';
  const [state, setState] = useState<ClipRecorderState>('idle');
  const [error, setError] = useState<string>();
  const [elapsed, setElapsed] = useState(0);

  const context = useRef<AudioContext | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const frames = useRef<Int16Array[]>([]);
  const level = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const onClipRef = useRef(onClip);
  onClipRef.current = onClip;

  const teardown = useCallback(() => {
    clearInterval(timer.current);
    timer.current = undefined;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = undefined;
    const ctx = context.current;
    context.current = undefined;
    if (ctx && ctx.state !== 'closed') void ctx.close();
    level.current = 0;
  }, []);

  const finish = useCallback(
    (deliver: boolean) => {
      if (!context.current) return;
      teardown();
      const recorded = frames.current;
      frames.current = [];
      setState('idle');
      setElapsed(0);
      if (deliver) onClipRef.current(framesDuration(recorded) < MIN_SECONDS ? null : encodeWav(recorded));
    },
    [teardown],
  );

  const start = useCallback(async () => {
    if (context.current) return;
    setError(undefined);
    if (!supported) {
      setError('Trình duyệt này chưa ghi âm được. Hãy dùng Chrome, Edge hoặc Safari mới, hoặc bấm "Gõ thay".');
      setState('error');
      return;
    }
    // Created inside the tap, so iOS/Safari let it run.
    const ctx = new AudioContext({ latencyHint: 'interactive' });
    context.current = ctx;
    frames.current = [];
    setState('requesting');
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      teardown();
      setError('Chưa có quyền dùng micro. Hãy cho phép micro cho trang này trong cài đặt trình duyệt, hoặc bấm "Gõ thay".');
      setState('error');
      return;
    }
    try {
      await ctx.resume();
      await ctx.audioWorklet.addModule(workletUrl);
      if (context.current !== ctx) return;
      const capture = new AudioWorkletNode(ctx, 'streetbiz-capture', { numberOfInputs: 1, numberOfOutputs: 1 });
      // Keep the node in the rendered graph without playing the mic back.
      const silent = ctx.createGain();
      silent.gain.value = 0;
      capture.connect(silent).connect(ctx.destination);
      capture.port.onmessage = (message: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
        frames.current.push(new Int16Array(message.data.pcm));
        level.current = message.data.level;
      };
      ctx.createMediaStreamSource(stream.current).connect(capture);
      const startedAt = Date.now();
      setElapsed(0);
      setState('recording');
      timer.current = setInterval(() => {
        const seconds = (Date.now() - startedAt) / 1000;
        setElapsed(Math.floor(seconds));
        if (seconds >= maxSeconds) finish(true);
      }, 250);
    } catch {
      teardown();
      setError('Không mở được micro. Thử lại, hoặc bấm "Gõ thay".');
      setState('error');
    }
  }, [finish, maxSeconds, supported, teardown]);

  /** Stops and hands the clip to `onClip`. */
  const stop = useCallback(() => finish(true), [finish]);
  /** Stops and throws the recording away. */
  const cancel = useCallback(() => finish(false), [finish]);
  const currentLevel = useCallback(() => level.current, []);

  useEffect(() => () => teardown(), [teardown]);

  return { supported, state, error, elapsed, maxSeconds, start, stop, cancel, level: currentLevel };
}
