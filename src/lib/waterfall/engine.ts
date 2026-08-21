import { FallsAudio } from "./audio";
import { Fauna } from "./fauna";
import { wrap24 } from "./noise";
import { sampleSky } from "./palette";
import {
  paintGodRays,
  paintMountains,
  paintPoolWater,
  paintSky,
  paintTerrain,
  paintVignette,
  terrainKey,
} from "./scenery";
import { layoutWorld, type Params } from "./types";
import { paintRainbow, qualityCap, WaterSim } from "./water";

export class CascadeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private terrain = document.createElement("canvas");
  private terrainCtx: CanvasRenderingContext2D;
  private terrainKey = "";
  private params: Params;
  private water = new WaterSim();
  private fauna = new Fauna();
  audio = new FallsAudio();
  private raf = 0;
  private last = 0;
  private time = 0;
  private running = false;
  private liveClock = 0;

  constructor(canvas: HTMLCanvasElement, params: Params) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Canvas 2D is not available in this browser.");
    this.ctx = ctx;
    const tctx = this.terrain.getContext("2d");
    if (!tctx) throw new Error("Offscreen canvas failed.");
    this.terrainCtx = tctx;
    this.params = { ...params };
    this.liveClock = params.timeOfDay;
  }

  setParams(params: Params) {
    if (Math.abs(params.timeOfDay - this.params.timeOfDay) > 0.0001) {
      this.liveClock = params.timeOfDay;
    }
    if (params.seed !== this.params.seed) this.fauna.reseed();
    this.params = { ...params };
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent?.clientWidth ?? window.innerWidth;
    const h = parent?.clientHeight ?? window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.terrainKey = "";
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    this.audio.dispose();
  }

  capture(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Capture failed"))),
        "image/png",
      );
    });
  }

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.last) / 1000, 0.1);
    this.last = now;
    this.time += dt;
    if (this.params.liveSky) {
      this.liveClock = wrap24(this.liveClock + dt * 0.05);
    } else {
      this.liveClock = this.params.timeOfDay;
    }
    this.render(dt);
    this.audio.chirp(dt, this.viewParams());
    this.raf = requestAnimationFrame(this.tick);
  };

  private viewParams(): Params {
    return { ...this.params, timeOfDay: this.liveClock };
  }

  private render(dt: number) {
    const cssW = this.canvas.clientWidth || 1;
    const cssH = this.canvas.clientHeight || 1;
    const narrow = cssW < 720;
    const p = this.viewParams();
    const world = layoutWorld(cssW, cssH, p, narrow);
    const sky = sampleSky(p.timeOfDay, p.weather);
    const key = terrainKey(p, cssW, cssH, narrow);
    if (key !== this.terrainKey) {
      this.terrain.width = Math.max(1, cssW);
      this.terrain.height = Math.max(1, cssH);
      this.terrainCtx.clearRect(0, 0, cssW, cssH);
      paintTerrain(this.terrainCtx, world, p);
      this.terrainKey = key;
    }

    const ctx = this.ctx;
    paintSky(ctx, world, sky, p, this.time);
    paintMountains(ctx, world, sky, p);
    ctx.drawImage(this.terrain, 0, 0, cssW, cssH);
    paintPoolWater(ctx, world, sky, p, this.time);

    this.water.step(dt, world, p, qualityCap(cssW, cssH, narrow));
    this.water.draw(ctx, world, p, this.time);

    paintRainbow(ctx, world, p);
    paintGodRays(ctx, world, sky, p);

    this.fauna.step(dt, world, p);
    this.fauna.draw(ctx, world, p);

    paintVignette(ctx, world, sky);
  }
}
