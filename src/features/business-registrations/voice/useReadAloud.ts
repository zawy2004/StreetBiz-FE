import { useCallback, useEffect, useState } from 'react';

type VoiceLike = Pick<SpeechSynthesisVoice, 'lang' | 'name' | 'localService'>;

/** Vietnamese voices that sound like a person, best first (Edge neural, Google, Apple). */
const PREFERRED = [/natural/i, /online/i, /hoaimy|namminh/i, /google/i, /linh/i];

/**
 * The most natural Vietnamese voice on this device, or null. Never a voice of another language:
 * an English voice reading Vietnamese is what made the assistant sound foreign.
 */
export function pickVietnameseVoice<T extends VoiceLike>(voices: readonly T[]): T | null {
  const vietnamese = voices.filter((v) => /^vi([-_]|$)/i.test(v.lang));
  if (vietnamese.length === 0) return null;
  const rank = (v: T) => {
    const hit = PREFERRED.findIndex((p) => p.test(v.name));
    return hit === -1 ? PREFERRED.length : hit;
  };
  return [...vietnamese].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

/**
 * Reads the question (or a card group) aloud with the device's own Vietnamese voice; used when
 * the live conversation is not running. Nothing is sent anywhere. Voices load after the page, so
 * this waits for them; with no Vietnamese voice the words stay on screen only.
 */
export function useReadAloud() {
  const synth = typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  const [voice, setVoice] = useState<SpeechSynthesisVoice | null>(() => (synth ? pickVietnameseVoice(synth.getVoices()) : null));
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!synth) return;
    const load = () => setVoice(pickVietnameseVoice(synth.getVoices()));
    load();
    synth.addEventListener?.('voiceschanged', load);
    return () => synth.removeEventListener?.('voiceschanged', load);
  }, [synth]);

  const stop = useCallback(() => {
    if (!synth) return;
    synth.cancel();
    setSpeaking(false);
  }, [synth]);

  const speak = useCallback(
    (text: string) => {
      if (!synth || !voice || !text.trim()) return;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\[AI\]\s*/g, ''));
      utterance.voice = voice;
      utterance.lang = voice.lang;
      utterance.rate = 0.95;
      utterance.onend = utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(utterance);
    },
    [synth, voice],
  );

  useEffect(
    () => () => {
      synth?.cancel();
    },
    [synth],
  );

  return { supported: !!synth && !!voice, speaking, speak, stop };
}
