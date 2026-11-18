import { useCallback, useEffect, useState } from 'react';

/** The browser's "install this app" event; not in lib.dom yet. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export type InstallState =
  /** Already running as an installed app, or the browser cannot install. */
  | { kind: 'none' }
  /** Chrome/Edge on Android or desktop: a prompt can be shown on request. */
  | { kind: 'prompt'; install: () => Promise<void> }
  /** iPhone/iPad Safari: no prompt exists; the user adds it from the Share menu. */
  | { kind: 'ios' };

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true || nav.standalone === true
  );
}

export function isIos(userAgent: string = navigator.userAgent): boolean {
  // iPadOS 13+ reports itself as a Mac with a touch screen.
  const iPadOs = /Macintosh/.test(userAgent) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(userAgent) || iPadOs;
}

/** Whether, and how, this browser can put StreetBiz on the home screen. */
export function useInstallPrompt(): InstallState {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!event) return;
    await event.prompt();
    await event.userChoice.catch(() => undefined);
    setEvent(null);
  }, [event]);

  if (installed) return { kind: 'none' };
  if (event) return { kind: 'prompt', install };
  if (isIos()) return { kind: 'ios' };
  return { kind: 'none' };
}
