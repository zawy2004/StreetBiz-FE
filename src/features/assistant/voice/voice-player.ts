import { pcm16ToFloat32 } from './voice-protocol';

/**
 * Gapless playback on the AudioContext clock. Each chunk belongs to a model "generation";
 * barge-in drops the interrupted generation immediately, including chunks already scheduled.
 */
export class VoicePlayer {
  private readonly output: GainNode;
  private readonly analyser: AnalyserNode;
  private readonly levels: Uint8Array<ArrayBuffer>;
  private readonly sources = new Map<AudioBufferSourceNode, number>();
  private nextTime = 0;
  private dropThrough = 0;

  constructor(
    private readonly context: AudioContext,
    private readonly sampleRate = 24000,
  ) {
    this.output = context.createGain();
    this.analyser = context.createAnalyser();
    this.analyser.fftSize = 512;
    this.levels = new Uint8Array(this.analyser.fftSize);
    this.output.connect(this.analyser);
    this.analyser.connect(context.destination);
  }

  get playing() {
    return this.sources.size > 0;
  }

  enqueue(generation: number, pcm: Int16Array) {
    if (generation <= this.dropThrough || pcm.length === 0) return;
    const buffer = this.context.createBuffer(1, pcm.length, this.sampleRate);
    buffer.copyToChannel(pcm16ToFloat32(pcm), 0);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(this.output);
    // A small lead absorbs network jitter without adding noticeable latency.
    const start = Math.max(this.context.currentTime + 0.04, this.nextTime);
    source.start(start);
    this.nextTime = start + buffer.duration;
    this.sources.set(source, generation);
    source.onended = () => this.sources.delete(source);
  }

  /** Stop everything at or before `generation`; later chunks of it are ignored as well. */
  interrupt(generation: number) {
    this.dropThrough = Math.max(this.dropThrough, generation);
    for (const [source, owner] of this.sources)
      if (owner <= generation) {
        try {
          source.stop();
        } catch {
          // Already stopped.
        }
        this.sources.delete(source);
      }
    if (this.sources.size === 0) this.nextTime = 0;
  }

  /** RMS of what is being played, 0..1, for the orb. */
  level() {
    this.analyser.getByteTimeDomainData(this.levels);
    let sum = 0;
    for (const value of this.levels) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    return Math.sqrt(sum / this.levels.length);
  }

  dispose() {
    this.interrupt(Number.MAX_SAFE_INTEGER);
    this.output.disconnect();
    this.analyser.disconnect();
  }
}
