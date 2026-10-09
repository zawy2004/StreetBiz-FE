import { useEffect, useRef, useState } from 'react';
import { screenshotPng } from './assistant-image';

/** Images stay local until the user consents and sends. Superseded decode work cannot restore an image. */
export function useAssistantImage() {
  const [image, setImage] = useState<{ png: string; name: string }>();
  const [preparing, setPreparing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const retryImage = useRef<
    { id: string; image: { png: string; name: string }; expires: number } | undefined
  >(undefined);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      generation.current++;
      retryImage.current = undefined;
      clearTimeout(retryTimer.current);
    },
    [],
  );
  const clear = () => {
    generation.current++;
    setImage(undefined);
    setConsent(false);
    setPreparing(false);
    setError('');
  };
  const choose = async (file?: File) => {
    if (!file) return;
    const current = ++generation.current;
    setPreparing(true);
    setImage(undefined);
    setConsent(false);
    setError('');
    try {
      const png = await screenshotPng(file);
      if (current === generation.current) setImage({ png, name: file.name });
    } catch (e) {
      if (current === generation.current)
        setError(e instanceof Error ? e.message : 'Không đọc được ảnh. Hãy chọn ảnh khác.');
    } finally {
      if (current === generation.current) setPreparing(false);
    }
  };
  const remember = (id: string, value: { png: string; name: string }) => {
    clearTimeout(retryTimer.current);
    retryImage.current = { id, image: value, expires: Date.now() + 300_000 };
    retryTimer.current = setTimeout(() => {
      retryImage.current = undefined;
    }, 300_000);
  };
  const restore = (id: string) => {
    const saved = retryImage.current;
    if (!saved || saved.id !== id || saved.expires <= Date.now()) return false;
    clear();
    setImage(saved.image);
    // Sending again still requires the user to confirm consent.
    return true;
  };
  return {
    image,
    preparing,
    consent,
    setConsent,
    error,
    setError,
    clear,
    choose,
    remember,
    restore,
  };
}
