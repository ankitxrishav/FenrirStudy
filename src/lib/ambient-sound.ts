export type AmbientSoundPreset = 'off' | 'rain' | 'brown' | 'library' | 'cafe' | 'fireplace';

export const AMBIENT_PRESETS: { id: AmbientSoundPreset; label: string }[] = [
  { id: 'off', label: 'Off' },
  { id: 'rain', label: 'Rain' },
  { id: 'brown', label: 'Brown Noise' },
  { id: 'library', label: 'Library' },
  { id: 'cafe', label: 'Cafe' },
  { id: 'fireplace', label: 'Fireplace' },
];

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private activePreset: AmbientSoundPreset = 'off';
  private volume = 0.35;
  private listeners = new Set<() => void>();

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  subscribe(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  private stopInternal() {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
  }

  setVolume(nextVol: number) {
    this.volume = Math.max(0, Math.min(1, nextVol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume * 0.4, this.ctx.currentTime, 0.08);
    }
    this.notify();
  }

  getVolume(): number {
    return this.volume;
  }

  getPreset(): AmbientSoundPreset {
    return this.activePreset;
  }

  play(preset: AmbientSoundPreset, vol?: number) {
    if (typeof window === 'undefined') return;
    if (vol !== undefined) this.volume = Math.max(0, Math.min(1, vol));
    this.activePreset = preset;
    this.notify();

    if (preset === 'off') {
      this.stopInternal();
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    this.stopInternal();

    const sampleRate = this.ctx.sampleRate;
    const length = sampleRate * 4;
    const buffer = this.ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      let lastOut = 0;
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        if (preset === 'brown') {
          lastOut = (lastOut + 0.02 * white) / 1.02;
          data[i] = lastOut * 3.0;
        } else if (preset === 'fireplace') {
          lastOut = (lastOut + 0.015 * white) / 1.015;
          const crackle = Math.random() > 0.9992 ? (Math.random() * 2 - 1) * 0.45 : 0;
          data[i] = lastOut * 2.4 + crackle;
        } else {
          // Pink-weighted ambient floor for rain / library / cafe
          b0 = 0.99765 * b0 + white * 0.099046;
          b1 = 0.963 * b1 + white * 0.2965164;
          b2 = 0.57 * b2 + white * 1.0526913;
          const pink = (b0 + b1 + b2 + white * 0.1848) * 0.14;
          if (preset === 'rain') {
            const drop = Math.random() > 0.997 ? (Math.random() - 0.5) * 0.25 : 0;
            data[i] = pink + drop;
          } else if (preset === 'cafe') {
            const murmur = Math.sin(i / (sampleRate * 0.25)) * 0.04;
            data[i] = pink * (0.85 + murmur);
          } else {
            data[i] = pink * 0.55;
          }
        }
      }
    }

    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    if (preset === 'library') {
      filter.type = 'lowpass';
      filter.frequency.value = 650;
    } else if (preset === 'rain') {
      filter.type = 'bandpass';
      filter.frequency.value = 1400;
      filter.Q.value = 0.45;
    } else if (preset === 'cafe') {
      filter.type = 'bandpass';
      filter.frequency.value = 720;
      filter.Q.value = 0.6;
    } else {
      filter.type = 'lowpass';
      filter.frequency.value = 480;
    }

    const gain = this.ctx.createGain();
    gain.gain.value = this.volume * 0.4;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(0);

    this.sourceNode = src;
    this.masterGain = gain;
  }

  dispose() {
    this.stopInternal();
    this.activePreset = 'off';
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}

export const ambientSoundEngine = new AmbientSoundEngine();
