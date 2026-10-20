import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
};

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** The storage key is read by the inline script in index.html before first paint. */
export const useThemeStore = create<ThemeState>()(
  persist((set) => ({ mode: 'system', setMode: (mode) => set({ mode }) }), { name: 'streetbiz-theme' }),
);

export function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(DARK_QUERY).matches
      : false;
  }
  return mode === 'dark';
}

function apply(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveDark(mode));
}

if (typeof window !== 'undefined') {
  apply(useThemeStore.getState().mode);
  useThemeStore.subscribe((s) => apply(s.mode));
  if (typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_QUERY).addEventListener('change', () => apply(useThemeStore.getState().mode));
  }
}

/** True while the dark palette is on screen, whichever way it was chosen. */
export function useIsDark(): boolean {
  const mode = useThemeStore((s) => s.mode);
  return resolveDark(mode);
}
