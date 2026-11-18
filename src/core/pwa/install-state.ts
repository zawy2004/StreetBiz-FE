/**
 * "Add to Home Screen" state, shared by every screen that offers it.
 *
 * Chrome/Android announces that the site is installable (`beforeinstallprompt`) and lets a page
 * trigger the install dialog. iOS never does: Safari has no prompt, so on iPhone/iPad the only
 * way is the Share menu, and the page can only explain the steps. Both are covered here.
 *
 * `initInstallState()` runs once at start-up (the event can fire before any screen mounts).
 */
import { useSyncExternalStore } from 'react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Snapshot = { canPrompt: boolean; installed: boolean };

let deferred: InstallPromptEvent | null = null;
let snapshot: Snapshot = { canPrompt: false, installed: false };
const listeners = new Set<() => void>();

function publish(next: Snapshot) {
  snapshot = next;
  listeners.forEach((listener) => listener());
}

/** True when the site is running as an installed app (no browser bars). */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** iPhone, iPad, iPod, and iPadOS (which reports itself as a Mac with a touch screen). */
export function isIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/** Facebook, Zalo, Instagram... open links in their own browser, which cannot add to Home Screen. */
export function isInAppBrowser(): boolean {
  return typeof navigator !== 'undefined' && /FBAN|FBAV|Zalo|Instagram|Line\/|MicroMessenger/i.test(navigator.userAgent);
}

/** A phone or tablet: the install offer is for them, not for a desktop browser. */
export function isTouchDevice(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

let started = false;

export function initInstallState() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferred = event as InstallPromptEvent;
    publish({ ...snapshot, canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    publish({ canPrompt: false, installed: true });
  });
}

/** Opens the browser's install dialog (Chrome/Android). Resolves true when the user accepted. */
export async function promptInstall(): Promise<boolean> {
  const event = deferred;
  if (!event) return false;
  deferred = null;
  publish({ ...snapshot, canPrompt: false });
  await event.prompt();
  const { outcome } = await event.userChoice;
  return outcome === 'accepted';
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export type InstallKind =
  /** Nothing to offer: already installed, a desktop, or a browser that cannot install. */
  | 'hidden'
  /** Chrome/Android: one tap opens the install dialog. */
  | 'prompt'
  /** iOS: show the Share-menu steps. */
  | 'ios';

export function useInstallKind(): InstallKind {
  const state = useSyncExternalStore(subscribe, () => snapshot);
  if (state.installed || isStandalone() || !isTouchDevice()) return 'hidden';
  if (isIos()) return 'ios';
  return state.canPrompt ? 'prompt' : 'hidden';
}
