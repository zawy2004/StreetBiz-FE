/**
 * The new-order chime, synthesised rather than shipped as a file: two rising
 * notes, short and bright enough to cut through a busy street but not a siren.
 *
 * Browsers keep audio locked until the person interacts with the page, so the
 * context is created (or resumed) on the first tap or key press and reused.
 */
type AudioContextClass = typeof AudioContext;

let context: AudioContext | null = null;

function audioClass(): AudioContextClass | undefined {
  if (typeof window === 'undefined') return undefined;
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextClass }).webkitAudioContext
  );
}

/** Call from a user gesture. Safe to call again; returns whether audio can play. */
export async function unlockChime(): Promise<boolean> {
  const Ctor = audioClass();
  if (!Ctor) return false;
  try {
    context ??= new Ctor();
    if (context.state === 'suspended') await context.resume();
    return context.state === 'running';
  } catch {
    return false;
  }
}

/** True once a gesture has unlocked audio in this tab. */
export function chimeReady(): boolean {
  return context?.state === 'running';
}

/** Unlocks audio on the first tap or key press anywhere, once. */
export function unlockChimeOnFirstGesture(): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const unlock = () => {
    void unlockChime();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
  return unlock;
}

/** Plays the chime. Returns false, silently, while audio is still locked. */
export function playChime(): boolean {
  if (!context || context.state !== 'running') return false;
  const start = context.currentTime + 0.01;
  // E6 then A6: a rising fourth reads as "something arrived", not "error".
  [
    { frequency: 1318.5, at: 0 },
    { frequency: 1760, at: 0.16 },
  ].forEach(({ frequency, at }) => {
    const oscillator = context!.createOscillator();
    const gain = context!.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    // A quick attack and a soft tail, so the notes ring rather than click.
    gain.gain.setValueAtTime(0.0001, start + at);
    gain.gain.exponentialRampToValueAtTime(0.35, start + at + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + 0.42);
    oscillator.connect(gain).connect(context!.destination);
    oscillator.start(start + at);
    oscillator.stop(start + at + 0.45);
  });
  return true;
}
