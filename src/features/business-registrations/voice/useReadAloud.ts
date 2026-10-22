import { useCallback, useEffect, useState } from 'react';

/**
 * Reads the assistant's question (or a card group) aloud with the browser's own Vietnamese voice.
 * Nothing is sent anywhere. Without speech synthesis the words stay on screen only.
 */
export function useReadAloud() {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text: string) => {
      if (!supported || !text.trim()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text.replace(/\[AI\]\s*/g, ''));
      utterance.lang = 'vi-VN';
      const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith('vi'));
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = utterance.onerror = () => setSpeaking(false);
      setSpeaking(true);
      synth.speak(utterance);
    },
    [supported],
  );

  useEffect(() => () => {
    if (supported) window.speechSynthesis.cancel();
  }, [supported]);

  return { supported, speaking, speak, stop };
}
