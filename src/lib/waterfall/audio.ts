import { clamp, lerp } from "./noise";
import type { Params } from "./types";

export class FallsAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private rumble: GainNode | null = null;
  private spray: GainNode | null = null;
  private birds: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private hiss: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private sources: AudioBufferSourceNode[] = [];
  private birdTimer = 0;
  private muted = true;
  private entered = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      this.entered = true;
      return;
    }
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AC({ latencyHint: "playback" });
    this.ctx = ctx;

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    this.master = master;

    const rumble = ctx.createGain();
    rumble.gain.value = 0.5;
    this.rumble = rumble;

    const spray = ctx.createGain();
    spray.gain.value = 0.22;
    this.spray = spray;

    const birds = ctx.createGain();
    birds.gain.value = 0.0;
    birds.connect(master);
    this.birds = birds;

    const noise = this.makeNoise(ctx, 2);

    const rumbleSrc = ctx.createBufferSource();
    rumbleSrc.buffer = noise;
    rumbleSrc.loop = true;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "bandpass";
    rumbleFilter.frequency.value = 140;
    rumbleFilter.Q.value = 0.7;
    this.filter = rumbleFilter;
    rumbleSrc.connect(rumbleFilter);
    rumbleFilter.connect(rumble);
    rumble.connect(master);

    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 35;
    lfo.connect(lfoGain);
    lfoGain.connect(rumbleFilter.frequency);
    lfo.start();
    this.lfo = lfo;

    const spraySrc = ctx.createBufferSource();
    spraySrc.buffer = noise;
    spraySrc.loop = true;
    const hiss = ctx.createBiquadFilter();
    hiss.type = "highpass";
    hiss.frequency.value = 1800;
    hiss.Q.value = 0.5;
    this.hiss = hiss;
    spraySrc.connect(hiss);
    hiss.connect(spray);
    spray.connect(master);

    rumbleSrc.start();
    spraySrc.start();
    this.sources = [rumbleSrc, spraySrc];
    this.entered = true;
    void ctx.resume();

    document.addEventListener("visibilitychange", this.onVis);
  }

  private onVis = () => {
    if (!this.ctx) return;
    if (document.visibilityState === "visible" && this.entered && !this.muted) {
      void this.ctx.resume();
    }
  };

  private makeNoise(ctx: AudioContext, seconds: number) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * seconds);
    const buffer = ctx.createBuffer(1, len, rate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = (white * 0.35 + last * 0.65) * 0.8;
    }
    return buffer;
  }

  apply(params: Params, muted: boolean) {
    this.muted = muted;
    if (!this.ctx || !this.master || !this.rumble || !this.spray) return;
    const now = this.ctx.currentTime;
    if (muted || !this.entered) {
      this.master.gain.setTargetAtTime(0, now, 0.05);
      return;
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    const vol = lerp(0.12, 0.72, params.flow);
    this.master.gain.setTargetAtTime(vol * vol, now, 0.08);
    this.rumble.gain.setTargetAtTime(lerp(0.28, 0.7, params.flow), now, 0.08);
    this.spray.gain.setTargetAtTime(
      lerp(0.08, 0.42, params.mist * 0.6 + params.flow * 0.4),
      now,
      0.08,
    );
    if (this.filter) {
      this.filter.frequency.setTargetAtTime(
        lerp(90, 220, params.flow),
        now,
        0.1,
      );
    }
    if (this.hiss) {
      this.hiss.frequency.setTargetAtTime(
        lerp(1400, 2800, params.mist),
        now,
        0.1,
      );
    }
    if (this.birds) {
      const day = params.timeOfDay > 6 && params.timeOfDay < 19;
      const birdVol =
        params.wildlife && day && params.weather < 0.55
          ? lerp(0.02, 0.12, 1 - params.weather)
          : 0;
      this.birds.gain.setTargetAtTime(birdVol, now, 0.2);
    }
  }

  chirp(dt: number, params: Params) {
    if (!this.ctx || !this.birds || this.muted || !this.entered) return;
    if (!params.wildlife) return;
    const day = params.timeOfDay > 6.2 && params.timeOfDay < 18.5;
    if (!day || params.weather > 0.6) return;
    this.birdTimer -= dt;
    if (this.birdTimer > 0) return;
    this.birdTimer = lerp(2.8, 8.5, Math.random());
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    const f0 = lerp(1800, 3400, Math.random());
    osc.frequency.setValueAtTime(f0, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      f0 * lerp(1.15, 1.45, Math.random()),
      ctx.currentTime + 0.12,
    );
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    osc.connect(gain);
    gain.connect(this.birds);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => {
      osc.disconnect();
      gain.disconnect();
    };
  }

  dispose() {
    document.removeEventListener("visibilitychange", this.onVis);
    for (const s of this.sources) {
      try {
        s.stop();
        s.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.lfo?.stop();
    void this.ctx?.close();
    this.ctx = null;
  }
}

export function audioLevel(params: Params, muted: boolean) {
  if (muted) return 0;
  return clamp(params.flow * 0.7 + params.mist * 0.3, 0, 1);
}
