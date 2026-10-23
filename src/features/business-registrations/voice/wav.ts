/** 16 kHz mono PCM16, as `capture.worklet.js` produces it. */
export const CLIP_SAMPLE_RATE = 16_000;

/**
 * Wraps PCM16 frames in a WAV header. Every speech-to-text provider takes WAV, and 60 s at
 * 16 kHz is under 2 MB -- inside the server's 4 MB clip limit.
 */
export function encodeWav(frames: Int16Array[], sampleRate = CLIP_SAMPLE_RATE): Blob {
  const samples = frames.reduce((n, f) => n + f.length, 0);
  const buffer = new ArrayBuffer(44 + samples * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };

  text(0, 'RIFF');
  view.setUint32(4, 36 + samples * 2, true);
  text(8, 'WAVE');
  text(12, 'fmt ');
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample
  text(36, 'data');
  view.setUint32(40, samples * 2, true);

  let offset = 44;
  for (const frame of frames) {
    for (let i = 0; i < frame.length; i++, offset += 2) view.setInt16(offset, frame[i]!, true);
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

/** Seconds of audio in a set of frames. */
export function framesDuration(frames: Int16Array[], sampleRate = CLIP_SAMPLE_RATE): number {
  return frames.reduce((n, f) => n + f.length, 0) / sampleRate;
}
