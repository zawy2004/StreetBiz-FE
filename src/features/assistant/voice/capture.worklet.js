/* global AudioWorkletProcessor, registerProcessor, sampleRate */
// Runs on the audio thread: downsample the mic to 16 kHz mono PCM16 in 40 ms frames.
const TARGET_RATE = 16000;
const FRAME_SAMPLES = 640;

class StreetBizCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    this.ratio = sampleRate / TARGET_RATE;
    this.position = 0;
    this.frame = new Int16Array(FRAME_SAMPLES);
    this.filled = 0;
    this.energy = 0;
    this.counted = 0;
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    // Average the source samples that fall into each 16 kHz slot (cheap low-pass + decimation).
    let index = this.position;
    while (index < channel.length) {
      const start = Math.floor(index);
      const end = Math.min(channel.length, Math.floor(index + this.ratio));
      let sum = 0;
      let count = 0;
      for (let i = start; i < Math.max(end, start + 1); i++) {
        sum += channel[i];
        count++;
      }
      const sample = Math.max(-1, Math.min(1, sum / count));
      this.energy += sample * sample;
      this.counted++;
      this.frame[this.filled++] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      if (this.filled === FRAME_SAMPLES) {
        const level = Math.sqrt(this.energy / this.counted);
        const out = this.frame.slice();
        this.port.postMessage({ pcm: out.buffer, level }, [out.buffer]);
        this.filled = 0;
        this.energy = 0;
        this.counted = 0;
      }
      index += this.ratio;
    }
    this.position = index - channel.length;
    return true;
  }
}

registerProcessor('streetbiz-capture', StreetBizCapture);
