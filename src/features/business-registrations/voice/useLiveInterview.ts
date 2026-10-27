import { useCallback, useEffect, useRef, useState } from 'react';

import { ApiError } from '@/core/api';
import { getAccessToken } from '@/core/api/token-storage';
import { env } from '@/core/config/env';
// Same capture worklet and gapless player as the voice assistant (a same-origin worklet file, so
// addModule works under a strict CSP).
import workletUrl from '@/features/assistant/voice/capture.worklet.js?url&no-inline';
import { VoicePlayer } from '@/features/assistant/voice/voice-player';
import {
  appendLiveCaption,
  closeLiveCaption,
  LiveInterviewLink,
  liveStreamUrl,
  type LiveCaption,
  type LiveStatus,
} from './live-interview';
import { voiceRegistrationApi } from './voice-registration-api';
import type { AssistDraft, AssistTurnResult } from './voice-registration.types';

type Options = {
  onAssist: (result: AssistTurnResult, cause: 'voice' | 'screen') => void;
  /** The assistant finished what it was saying. */
  onTurnComplete?: () => void;
  /**
   * The conversation stopped before the interview was done: carry on with tap-to-talk. `message`
   * is the server's own explanation when it refused to start one (daily limit, another session…).
   */
  onStopped: (reason: string, message?: string) => void;
};

/** A browser that can stream the microphone and play the reply as it arrives. */
export function canTalkLive() {
  return (
    typeof window !== 'undefined' &&
    typeof WebSocket !== 'undefined' &&
    typeof AudioWorkletNode !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia
  );
}

/**
 * X01 v2: the interview as one continuous conversation. The microphone streams to the server
 * (never stored), the assistant's voice plays as it arrives, and every value still comes back as
 * an `assist` result checked by the server. Ends on unmount or after 30 s in a hidden tab.
 */
export function useLiveInterview({ onAssist, onTurnComplete, onStopped }: Options) {
  const [status, setStatus] = useState<LiveStatus>('idle');
  const [captions, setCaptions] = useState<LiveCaption[]>([]);
  const [notice, setNotice] = useState('');
  const [muted, setMutedState] = useState(false);
  const [pending, setPending] = useState(false);

  const link = useRef<LiveInterviewLink | undefined>(undefined);
  const context = useRef<AudioContext | undefined>(undefined);
  const stream = useRef<MediaStream | undefined>(undefined);
  const player = useRef<VoicePlayer | undefined>(undefined);
  const micLevel = useRef(0);
  const callbacks = useRef({ onAssist, onTurnComplete, onStopped });
  useEffect(() => {
    callbacks.current = { onAssist, onTurnComplete, onStopped };
  });

  const teardown = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = undefined;
    player.current?.dispose();
    player.current = undefined;
    const ctx = context.current;
    context.current = undefined;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
    micLevel.current = 0;
  }, []);

  const stopped = useCallback(
    (reason: string, message?: string) => {
      link.current = undefined;
      teardown();
      setPending(false);
      setStatus('ended');
      callbacks.current.onStopped(reason, message);
    },
    [teardown],
  );

  /** Must run inside the vendor's tap: browsers only allow audio and the microphone from a gesture. */
  const start = useCallback(
    async (draft: AssistDraft, voiceConsent: boolean) => {
      if (link.current || context.current) return;
      setCaptions([]);
      setNotice('');
      setMutedState(false);
      setStatus('connecting');
      const ctx = new AudioContext({ latencyHint: 'interactive' });
      context.current = ctx;
      try {
        stream.current = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        });
        await ctx.resume();
        await ctx.audioWorklet.addModule(workletUrl);
      } catch {
        stopped('mic');
        return;
      }

      let ticket;
      try {
        ticket = await voiceRegistrationApi.startLive(draft, voiceConsent);
      } catch (err) {
        // 503/429/409 carry a sentence written for this screen ("…bấm để nói"); show it as is.
        const refused = err instanceof ApiError && [409, 429, 503].includes(err.status);
        stopped(err instanceof ApiError ? err.code : 'voice_unavailable', refused ? err.message : undefined);
        return;
      }
      if (context.current !== ctx) return;

      player.current = new VoicePlayer(ctx, ticket.outputSampleRate);
      let socket: WebSocket;
      try {
        socket = new WebSocket(
          liveStreamUrl(env.apiBaseUrl, window.location.origin, ticket.streamPath, ticket.ticket, getAccessToken() ?? ''),
        );
      } catch {
        stopped('disconnected');
        return;
      }
      socket.binaryType = 'arraybuffer';
      const current = new LiveInterviewLink(socket, {
        onAssist: (result, cause) => {
          setPending(false);
          callbacks.current.onAssist(result, cause);
        },
        onStatus: (next) => {
          if (next !== 'ended') setStatus(next);
        },
        onCaption: (who, text) => setCaptions((c) => appendLiveCaption(c, who, text)),
        onAudio: (generation, pcm) => player.current?.enqueue(generation, pcm),
        onInterrupted: (generation) => {
          player.current?.interrupt(generation);
          setCaptions(closeLiveCaption);
        },
        onTurnComplete: () => {
          setCaptions(closeLiveCaption);
          callbacks.current.onTurnComplete?.();
        },
        onNotice: setNotice,
        onEnded: (reason) => {
          if (link.current === current) stopped(reason);
        },
      });
      socket.onmessage = (message) => current.receive(message.data);
      socket.onclose = () => current.closed();
      link.current = current;

      const capture = new AudioWorkletNode(ctx, 'streetbiz-capture', { numberOfInputs: 1, numberOfOutputs: 1 });
      // Keep the capture node in the rendered graph without playing the microphone back.
      const silent = ctx.createGain();
      silent.gain.value = 0;
      capture.connect(silent).connect(ctx.destination);
      capture.port.onmessage = (message: MessageEvent<{ pcm: ArrayBuffer; level: number }>) => {
        micLevel.current = message.data.level;
        link.current?.sendAudio(message.data.pcm);
      };
      ctx.createMediaStreamSource(stream.current).connect(capture);
    },
    [stopped],
  );

  const end = useCallback(() => {
    const current = link.current;
    if (!current) return;
    current.end();
    // The server answers "ended"; never keep the microphone open if it does not.
    setTimeout(() => {
      if (link.current === current) current.close('ended');
    }, 1500);
  }, []);

  const setMuted = useCallback((value: boolean) => {
    setMutedState(value);
    stream.current?.getAudioTracks().forEach((track) => (track.enabled = !value));
    link.current?.setMuted(value);
  }, []);

  const sendDraft = useCallback((draft: AssistDraft) => {
    const sent = link.current?.sendDraft(draft) ?? false;
    setPending(sent);
    return sent;
  }, []);

  const sendText = useCallback((text: string) => link.current?.sendText(text) ?? false, []);

  /** 0..1 for the ring: the assistant's voice while it speaks, the vendor's otherwise. */
  const level = useCallback(() => {
    const out = player.current?.playing ? player.current.level() : 0;
    return Math.min(1, Math.max(out * 2.5, micLevel.current * 4));
  }, []);

  useEffect(() => {
    let hidden: ReturnType<typeof setTimeout> | undefined;
    const onVisibility = () => {
      clearTimeout(hidden);
      if (document.visibilityState === 'hidden' && link.current)
        hidden = setTimeout(() => link.current?.close('hidden'), 30_000);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(hidden);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(
    () => () => {
      const current = link.current;
      link.current = undefined;
      current?.close('ended');
      teardown();
    },
    [teardown],
  );

  return {
    status,
    captions,
    notice,
    muted,
    pending,
    active: status !== 'idle' && status !== 'ended',
    start,
    end,
    setMuted,
    sendDraft,
    sendText,
    level,
  };
}
