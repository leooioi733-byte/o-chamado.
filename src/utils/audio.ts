export interface JordanAmbienceConfig {
  waterLevel: number;
  crowdLevel: number;
  birdsLevel: number;
  windLevel?: number;
  fireLevel?: number;
  cricketLevel?: number;
  wavesLevel?: number;
}

class ContemplativeAudioEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private ambientActive: boolean = false;
  private droneGain: GainNode | null = null;
  private oscillators: OscillatorNode[] = [];

  // Dynamic environmental audio graph
  private jordanGraphReady: boolean = false;
  private jordanActive: boolean = false;
  private jordanMasterGain: GainNode | null = null;
  private waterBusGain: GainNode | null = null;
  private crowdBusGain: GainNode | null = null;
  private windBusGain: GainNode | null = null;
  private fireBusGain: GainNode | null = null;
  private wavesBusGain: GainNode | null = null;

  private jordanConfig: Required<JordanAmbienceConfig> = {
    waterLevel: 0.45,
    crowdLevel: 0.25,
    birdsLevel: 0.5,
    windLevel: 0.18,
    fireLevel: 0.0,
    cricketLevel: 0.0,
    wavesLevel: 0.0,
  };

  private birdTimerId: number | null = null;
  private fireTimerId: number | null = null;
  private cricketTimerId: number | null = null;
  private unlockBound: boolean = false;
  private lastFootstepAt = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
      this.bindUnlockOnGesture();
    }
    return this.ctx;
  }

  private bindUnlockOnGesture(): void {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;
    const resume = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx
          .resume()
          .then(() => {
            if (this.jordanActive && !this.jordanGraphReady) {
              this.initJordanGraph();
            }
            this.applyJordanLevels();
          })
          .catch(() => {});
      }
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      this.unlockBound = false;
    };
    window.addEventListener('pointerdown', resume, { passive: true });
    window.addEventListener('keydown', resume, { passive: true });
  }

  private createLoopingNoiseBuffer(
    ctx: AudioContext,
    durationSec = 3.0,
    warmth = 0.65
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);

    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last * warmth + white * (1 - warmth)) * 1.15;
      data[i] = Math.max(-1, Math.min(1, last));
    }

    // Cross-fade loop seam so there is zero click when wrapping
    const fadeSamples = Math.min(2048, Math.floor(length * 0.05));
    for (let i = 0; i < fadeSamples; i++) {
      const t = i / fadeSamples;
      const tailIdx = length - fadeSamples + i;
      data[i] = data[i] * t + data[tailIdx] * (1 - t);
    }

    return buffer;
  }

  private initJordanGraph(): void {
    if (this.jordanGraphReady) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const jordanMaster = ctx.createGain();
      jordanMaster.gain.value = this.muted ? 0 : 1;
      jordanMaster.connect(ctx.destination);

      // 1. Running River Water (low-mid current + crisp surface babble + LFO flow swell)
      const waterBuffer = this.createLoopingNoiseBuffer(ctx, 3.2, 0.58);
      const waterSrc = ctx.createBufferSource();
      waterSrc.buffer = waterBuffer;
      waterSrc.loop = true;

      const waterBus = ctx.createGain();
      waterBus.gain.value = 0.0001;
      waterBus.connect(jordanMaster);

      const lowFilter = ctx.createBiquadFilter();
      lowFilter.type = 'bandpass';
      lowFilter.frequency.value = 390;
      lowFilter.Q.value = 0.72;

      const lowGain = ctx.createGain();
      lowGain.gain.value = 0.65;

      const highFilter = ctx.createBiquadFilter();
      highFilter.type = 'bandpass';
      highFilter.frequency.value = 1750;
      highFilter.Q.value = 1.15;

      const highGain = ctx.createGain();
      highGain.gain.value = 0.28;

      const waterLfo = ctx.createOscillator();
      waterLfo.type = 'sine';
      waterLfo.frequency.value = 0.19;
      const lfoToLow = ctx.createGain();
      lfoToLow.gain.value = 95;
      const lfoToHigh = ctx.createGain();
      lfoToHigh.gain.value = 340;
      waterLfo.connect(lfoToLow);
      waterLfo.connect(lfoToHigh);
      lfoToLow.connect(lowFilter.frequency);
      lfoToHigh.connect(highFilter.frequency);

      waterSrc.connect(lowFilter);
      lowFilter.connect(lowGain);
      lowGain.connect(waterBus);

      waterSrc.connect(highFilter);
      highFilter.connect(highGain);
      highGain.connect(waterBus);

      waterSrc.start();
      waterLfo.start();

      // 2. Distant Crowd Murmur (warm vocal formants modulated gently)
      const crowdBuffer = this.createLoopingNoiseBuffer(ctx, 3.6, 0.78);
      const crowdSrc = ctx.createBufferSource();
      crowdSrc.buffer = crowdBuffer;
      crowdSrc.loop = true;

      const crowdBus = ctx.createGain();
      crowdBus.gain.value = 0.0001;
      crowdBus.connect(jordanMaster);

      const formant1 = ctx.createBiquadFilter();
      formant1.type = 'bandpass';
      formant1.frequency.value = 285;
      formant1.Q.value = 2.8;

      const formant1Gain = ctx.createGain();
      formant1Gain.gain.value = 0.75;

      const formant2 = ctx.createBiquadFilter();
      formant2.type = 'bandpass';
      formant2.frequency.value = 610;
      formant2.Q.value = 3.2;

      const formant2Gain = ctx.createGain();
      formant2Gain.gain.value = 0.45;

      const crowdLfo1 = ctx.createOscillator();
      crowdLfo1.type = 'sine';
      crowdLfo1.frequency.value = 0.24;
      const crowdLfoGain1 = ctx.createGain();
      crowdLfoGain1.gain.value = 0.25;
      crowdLfo1.connect(crowdLfoGain1);
      crowdLfoGain1.connect(formant1Gain.gain);

      const crowdLfo2 = ctx.createOscillator();
      crowdLfo2.type = 'sine';
      crowdLfo2.frequency.value = 0.37;
      const crowdLfoGain2 = ctx.createGain();
      crowdLfoGain2.gain.value = 0.18;
      crowdLfo2.connect(crowdLfoGain2);
      crowdLfoGain2.connect(formant2Gain.gain);

      crowdSrc.connect(formant1);
      formant1.connect(formant1Gain);
      formant1Gain.connect(crowdBus);

      crowdSrc.connect(formant2);
      formant2.connect(formant2Gain);
      formant2Gain.connect(crowdBus);

      crowdSrc.start();
      crowdLfo1.start();
      crowdLfo2.start();

      // 3. Soft Valley & Cliff Wind Breeze (slow sweeping airy bandpass)
      const windBuffer = this.createLoopingNoiseBuffer(ctx, 4.2, 0.84);
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = windBuffer;
      windSrc.loop = true;

      const windBus = ctx.createGain();
      windBus.gain.value = 0.0001;
      windBus.connect(jordanMaster);

      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 480;
      windFilter.Q.value = 1.45;

      const windLfo = ctx.createOscillator();
      windLfo.type = 'sine';
      windLfo.frequency.value = 0.11;
      const windLfoGain = ctx.createGain();
      windLfoGain.gain.value = 210;
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);

      windSrc.connect(windFilter);
      windFilter.connect(windBus);
      windSrc.start();
      windLfo.start();

      // 4. Campfire / Brazier Warm Ember Rumble
      const fireBuffer = this.createLoopingNoiseBuffer(ctx, 2.8, 0.72);
      const fireSrc = ctx.createBufferSource();
      fireSrc.buffer = fireBuffer;
      fireSrc.loop = true;

      const fireBus = ctx.createGain();
      fireBus.gain.value = 0.0001;
      fireBus.connect(jordanMaster);

      const fireFilter = ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.value = 310;

      fireSrc.connect(fireFilter);
      fireFilter.connect(fireBus);
      fireSrc.start();

      // 5. Galilee Shore Surf Wash (slow tidal wave swell)
      const wavesBuffer = this.createLoopingNoiseBuffer(ctx, 4.5, 0.68);
      const wavesSrc = ctx.createBufferSource();
      wavesSrc.buffer = wavesBuffer;
      wavesSrc.loop = true;

      const wavesBus = ctx.createGain();
      wavesBus.gain.value = 0.0001;
      wavesBus.connect(jordanMaster);

      const wavesFilter = ctx.createBiquadFilter();
      wavesFilter.type = 'lowpass';
      wavesFilter.frequency.value = 540;

      const wavesSwellGain = ctx.createGain();
      wavesSwellGain.gain.value = 0.62;

      const wavesLfo = ctx.createOscillator();
      wavesLfo.type = 'sine';
      wavesLfo.frequency.value = 0.14;
      const wavesLfoDepth = ctx.createGain();
      wavesLfoDepth.gain.value = 0.36;
      wavesLfo.connect(wavesLfoDepth);
      wavesLfoDepth.connect(wavesSwellGain.gain);

      wavesSrc.connect(wavesFilter);
      wavesFilter.connect(wavesSwellGain);
      wavesSwellGain.connect(wavesBus);
      wavesSrc.start();
      wavesLfo.start();

      this.jordanMasterGain = jordanMaster;
      this.waterBusGain = waterBus;
      this.crowdBusGain = crowdBus;
      this.windBusGain = windBus;
      this.fireBusGain = fireBus;
      this.wavesBusGain = wavesBus;
      this.jordanGraphReady = true;
    } catch {
      // Ignore audio init errors in restricted environments
    }
  }

  private applyJordanLevels(): void {
    if (!this.ctx || !this.jordanGraphReady) return;
    const now = this.ctx.currentTime;

    if (this.jordanMasterGain) {
      this.jordanMasterGain.gain.setTargetAtTime(
        this.muted || !this.jordanActive ? 0 : 1,
        now,
        0.35
      );
    }

    if (this.waterBusGain) {
      const targetWater =
        this.jordanActive && this.jordanConfig.waterLevel > 0.01
          ? 0.008 + Math.max(0, Math.min(1, this.jordanConfig.waterLevel)) * 0.068
          : 0;
      this.waterBusGain.gain.setTargetAtTime(targetWater, now, 0.45);
    }

    if (this.crowdBusGain) {
      const targetCrowd = this.jordanActive
        ? Math.max(0, Math.min(1, this.jordanConfig.crowdLevel)) * 0.052
        : 0;
      this.crowdBusGain.gain.setTargetAtTime(targetCrowd, now, 0.45);
    }

    if (this.windBusGain) {
      const targetWind = this.jordanActive
        ? Math.max(0, Math.min(1, this.jordanConfig.windLevel)) * 0.044
        : 0;
      this.windBusGain.gain.setTargetAtTime(targetWind, now, 0.5);
    }

    if (this.fireBusGain) {
      const targetFire = this.jordanActive
        ? Math.max(0, Math.min(1, this.jordanConfig.fireLevel)) * 0.055
        : 0;
      this.fireBusGain.gain.setTargetAtTime(targetFire, now, 0.45);
    }

    if (this.wavesBusGain) {
      const targetWaves = this.jordanActive
        ? Math.max(0, Math.min(1, this.jordanConfig.wavesLevel)) * 0.075
        : 0;
      this.wavesBusGain.gain.setTargetAtTime(targetWaves, now, 0.5);
    }
  }

  private spawnMorningBirdChirp(): void {
    if (
      this.muted ||
      !this.jordanActive ||
      this.jordanConfig.birdsLevel <= 0.04
    ) {
      return;
    }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.jordanMasterGain) return;

    try {
      const now = ctx.currentTime;
      const notes = 2 + Math.floor(Math.random() * 2);
      const baseFreq = 2250 + Math.random() * 1250;
      const volume = 0.008 + this.jordanConfig.birdsLevel * 0.014;

      const chirpFilter = ctx.createBiquadFilter();
      chirpFilter.type = 'bandpass';
      chirpFilter.frequency.value = baseFreq + 400;
      chirpFilter.Q.value = 1.6;

      if (typeof ctx.createStereoPanner === 'function') {
        const panner = ctx.createStereoPanner();
        panner.pan.value = (Math.random() - 0.5) * 1.4;
        chirpFilter.connect(panner);
        panner.connect(this.jordanMasterGain);
      } else {
        chirpFilter.connect(this.jordanMasterGain);
      }

      for (let i = 0; i < notes; i++) {
        const t0 = now + i * (0.11 + Math.random() * 0.06);
        const dur = 0.065 + Math.random() * 0.045;

        const osc = ctx.createOscillator();
        const env = ctx.createGain();

        osc.type = 'sine';
        const fStart =
          baseFreq * (1 + i * 0.08 + (Math.random() - 0.5) * 0.1);
        const fPeak = fStart * (1.16 + Math.random() * 0.14);
        osc.frequency.setValueAtTime(fStart, t0);
        osc.frequency.exponentialRampToValueAtTime(fPeak, t0 + dur * 0.55);
        osc.frequency.exponentialRampToValueAtTime(fStart * 0.96, t0 + dur);

        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(volume, t0 + dur * 0.22);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

        osc.connect(env);
        env.connect(chirpFilter);

        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      }
    } catch {
      // Safe fallback
    }
  }

  private spawnFireCrackle(): void {
    if (
      this.muted ||
      !this.jordanActive ||
      this.jordanConfig.fireLevel <= 0.06
    ) {
      return;
    }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.jordanMasterGain) return;

    try {
      const now = ctx.currentTime;
      const bursts = 1 + Math.floor(Math.random() * 2);
      for (let b = 0; b < bursts; b++) {
        const t0 = now + b * (0.04 + Math.random() * 0.09);
        const dur = 0.028 + Math.random() * 0.032;
        const len = Math.max(128, Math.floor(ctx.sampleRate * dur));
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) {
          const env = Math.pow(1 - i / len, 2.4);
          data[i] = (Math.random() * 2 - 1) * env;
        }
        const src = ctx.createBufferSource();
        src.buffer = buf;

        const hp = ctx.createBiquadFilter();
        hp.type = 'bandpass';
        hp.frequency.value = 1800 + Math.random() * 2200;
        hp.Q.value = 1.8;

        const g = ctx.createGain();
        g.gain.value = (0.015 + Math.random() * 0.022) * this.jordanConfig.fireLevel;

        src.connect(hp);
        hp.connect(g);
        g.connect(this.jordanMasterGain);
        src.start(t0);
      }
    } catch {
      // Safe fallback
    }
  }

  private spawnCricketChirp(): void {
    if (
      this.muted ||
      !this.jordanActive ||
      this.jordanConfig.cricketLevel <= 0.06
    ) {
      return;
    }
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.jordanMasterGain) return;

    try {
      const now = ctx.currentTime;
      const pulses = 3 + Math.floor(Math.random() * 2);
      const baseFreq = 4150 + Math.random() * 480;
      const vol = 0.004 + this.jordanConfig.cricketLevel * 0.008;

      for (let p = 0; p < pulses; p++) {
        const t0 = now + p * 0.052;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq, t0);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.036);
        osc.connect(g);
        g.connect(this.jordanMasterGain);
        osc.start(t0);
        osc.stop(t0 + 0.045);
      }
    } catch {
      // Safe fallback
    }
  }

  private scheduleBirdsLoop(): void {
    if (this.birdTimerId !== null) {
      window.clearTimeout(this.birdTimerId);
      this.birdTimerId = null;
    }
    if (!this.jordanActive || typeof window === 'undefined') return;

    const minDelay = 1650;
    const maxDelay = 4200 - this.jordanConfig.birdsLevel * 1200;
    const delay =
      minDelay + Math.random() * Math.max(600, maxDelay - minDelay);

    this.birdTimerId = window.setTimeout(() => {
      this.spawnMorningBirdChirp();
      this.scheduleBirdsLoop();
    }, delay);
  }

  private scheduleFireLoop(): void {
    if (this.fireTimerId !== null) {
      window.clearTimeout(this.fireTimerId);
      this.fireTimerId = null;
    }
    if (!this.jordanActive || typeof window === 'undefined') return;

    const delay = 480 + Math.random() * 980;
    this.fireTimerId = window.setTimeout(() => {
      this.spawnFireCrackle();
      this.scheduleFireLoop();
    }, delay);
  }

  private scheduleCricketLoop(): void {
    if (this.cricketTimerId !== null) {
      window.clearTimeout(this.cricketTimerId);
      this.cricketTimerId = null;
    }
    if (!this.jordanActive || typeof window === 'undefined') return;

    const delay = 1100 + Math.random() * 1900;
    this.cricketTimerId = window.setTimeout(() => {
      this.spawnCricketChirp();
      this.scheduleCricketLoop();
    }, delay);
  }

  public setJordanAmbience(
    active: boolean,
    config?: Partial<JordanAmbienceConfig>
  ): void {
    this.jordanActive = active;
    if (config) {
      this.jordanConfig = {
        ...this.jordanConfig,
        windLevel: config.windLevel ?? 0.16,
        fireLevel: config.fireLevel ?? 0.0,
        cricketLevel: config.cricketLevel ?? 0.0,
        wavesLevel: config.wavesLevel ?? 0.0,
        ...config,
      };
    }

    if (active) {
      this.initJordanGraph();
      this.applyJordanLevels();
      if (this.birdTimerId === null) {
        if (this.jordanConfig.birdsLevel > 0.3 && !this.muted) {
          window.setTimeout(() => this.spawnMorningBirdChirp(), 650);
        }
        this.scheduleBirdsLoop();
      }
      if (this.fireTimerId === null) {
        this.scheduleFireLoop();
      }
      if (this.cricketTimerId === null) {
        this.scheduleCricketLoop();
      }
    } else {
      if (this.birdTimerId !== null) {
        window.clearTimeout(this.birdTimerId);
        this.birdTimerId = null;
      }
      if (this.fireTimerId !== null) {
        window.clearTimeout(this.fireTimerId);
        this.fireTimerId = null;
      }
      if (this.cricketTimerId !== null) {
        window.clearTimeout(this.cricketTimerId);
        this.cricketTimerId = null;
      }
      this.applyJordanLevels();
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.droneGain && this.ctx) {
      this.droneGain.gain.setTargetAtTime(
        muted ? 0 : 0.022,
        this.ctx.currentTime,
        0.25
      );
    }
    this.applyJordanLevels();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    if (!this.muted && !this.ambientActive) {
      this.startAmbient();
    }
    if (!this.muted && this.jordanActive) {
      this.initJordanGraph();
      this.applyJordanLevels();
    }
    return this.muted;
  }

  public startAmbient(): void {
    if (this.ambientActive || this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const master = ctx.createGain();
      master.gain.value = 0.001;
      master.connect(ctx.destination);
      master.gain.setTargetAtTime(0.022, ctx.currentTime, 1.8);

      // Gentle warm Dsus2 1st-century open-fifth ambient pad (D3, A3, E4)
      const freqs = [146.83, 220.0, 329.63];
      const oscs: OscillatorNode[] = [];

      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const subGain = ctx.createGain();
        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.value = f;
        subGain.gain.value = idx === 0 ? 0.5 : 0.22;
        osc.connect(subGain);
        subGain.connect(master);
        osc.start();
        oscs.push(osc);
      });

      this.droneGain = master;
      this.oscillators = oscs;
      this.ambientActive = true;
    } catch {
      // Ignore audio init errors in restricted environments
    }
  }

  public playFootstep(surface: 'dirt' | 'stone' | 'water' = 'dirt'): void {
    if (this.muted) return;
    const perfNow = performance.now();
    if (perfNow - this.lastFootstepAt < 260) return;
    this.lastFootstepAt = perfNow;

    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const dur = surface === 'water' ? 0.19 : surface === 'stone' ? 0.075 : 0.095;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.sin(Math.min(1, t * 5) * (Math.PI / 2)) * Math.pow(1 - t, 2.1);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = surface === 'water' ? 'bandpass' : 'lowpass';
      const jitter = (Math.random() - 0.5) * 140;
      bp.frequency.value =
        (surface === 'water' ? 980 : surface === 'stone' ? 760 : 520) + jitter;
      bp.Q.value = surface === 'water' ? 1.1 : 0.8;

      const g = ctx.createGain();
      g.gain.value = surface === 'water' ? 0.055 : surface === 'stone' ? 0.045 : 0.038;

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
    } catch {
      // Safe fallback
    }
  }

  public playWaterSplash(intensity = 0.7): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const dur = 0.65;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.sin(Math.min(1, t * 7) * (Math.PI / 2)) * Math.pow(1 - t, 1.7);
        data[i] = (Math.random() * 2 - 1) * env;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(620, now);
      bp.frequency.exponentialRampToValueAtTime(1680, now + 0.25);
      bp.frequency.exponentialRampToValueAtTime(520, now + dur);
      bp.Q.value = 0.9;

      const g = ctx.createGain();
      g.gain.value = 0.065 * Math.max(0.25, Math.min(1.2, intensity));

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
    } catch {
      // Safe fallback
    }
  }

  public playWaterPour(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const dur = 1.35;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const env = Math.sin(t * Math.PI);
        const ripple = 0.7 + 0.3 * Math.sin(t * Math.PI * 16);
        data[i] = (Math.random() * 2 - 1) * env * ripple;
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      // Rising clay-basin pitch resonance as water fills the vessel
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(540, now);
      bp.frequency.exponentialRampToValueAtTime(1120, now + dur);
      bp.Q.value = 2.1;

      const g = ctx.createGain();
      g.gain.value = 0.055;

      src.connect(bp);
      bp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
    } catch {
      // Safe fallback
    }
  }

  public playDoorCreak(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const lp = ctx.createBiquadFilter();
      const g = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(118, now);
      osc.frequency.linearRampToValueAtTime(144, now + 0.25);
      osc.frequency.linearRampToValueAtTime(98, now + 0.55);

      lp.type = 'bandpass';
      lp.frequency.value = 420;
      lp.Q.value = 2.6;

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.025, now + 0.12);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);

      osc.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch {
      // Safe fallback
    }
  }

  public playClothRustle(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || ctx.state !== 'running') return;

    try {
      const now = ctx.currentTime;
      const dur = 0.22;
      const len = Math.floor(ctx.sampleRate * dur);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        data[i] = (Math.random() * 2 - 1) * Math.sin(t * Math.PI);
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;

      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.value = 1350;
      hp.Q.value = 1.4;

      const g = ctx.createGain();
      g.gain.value = 0.032;

      src.connect(hp);
      hp.connect(g);
      g.connect(ctx.destination);
      src.start(now);
    } catch {
      // Safe fallback
    }
  }

  public playDivineShimmer(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [293.66, 440.0, 587.33, 880.0];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);

        g.gain.setValueAtTime(0.0001, now + idx * 0.14);
        g.gain.exponentialRampToValueAtTime(0.024, now + idx * 0.14 + 0.7);
        g.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 3.1);

        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 3.2);
      });
    } catch {
      // Safe fallback
    }
  }

  public playPluck(pitchIndex: number = 0): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    // Pentatonic gentle lyre notes (D4, E4, F#4, A4, B4, D5)
    const scale = [293.66, 329.63, 369.99, 440.0, 493.88, 587.33];
    const freq = scale[Math.abs(pitchIndex) % scale.length];

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.055, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.95);
    } catch {
      // Safe fallback
    }
  }

  public playSoftConfirm(): void {
    this.playPluck(3);
    setTimeout(() => this.playPluck(5), 90);
  }

  public playHeavenCrescendo(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, now);
      master.gain.exponentialRampToValueAtTime(0.075, now + 3.4);
      master.gain.exponentialRampToValueAtTime(0.095, now + 5.6);
      master.gain.exponentialRampToValueAtTime(0.0001, now + 9.2);

      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(420, now);
      lp.frequency.exponentialRampToValueAtTime(2200, now + 4.5);
      lp.frequency.exponentialRampToValueAtTime(900, now + 9.0);

      master.connect(lp);
      lp.connect(ctx.destination);

      // Luminous D-major open harmonic choir (D3, A3, D4, F#4, A4, D5)
      const freqs = [146.83, 220.0, 293.66, 369.99, 440.0, 587.33];
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        osc.type = idx < 2 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, now);
        voiceGain.gain.setValueAtTime(idx < 2 ? 0.28 : 0.16, now);
        osc.connect(voiceGain);
        voiceGain.connect(master);
        osc.start(now + idx * 0.22);
        osc.stop(now + 9.4);
      });
    } catch {
      // Safe fallback
    }
  }
}

export const audioEngine = new ContemplativeAudioEngine();
