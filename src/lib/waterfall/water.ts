import { fbm, lerp, clamp } from "./noise";
import { mixRgb, rgba, sampleSky, type RGB } from "./palette";
import type { Params, World } from "./types";

type Kind = "drop" | "splash" | "mist" | "foam" | "leaf" | "snow" | "rain";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  kind: Kind;
  hue: number;
}

export class WaterSim {
  private pool: Particle[] = [];
  private live = 0;
  private spawnAcc = 0;
  private weatherAcc = 0;
  private leafAcc = 0;

  reset() {
    this.live = 0;
    this.spawnAcc = 0;
  }

  private alloc(): Particle {
    if (this.live < this.pool.length) {
      return this.pool[this.live++]!;
    }
    const p: Particle = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      max: 1,
      size: 1,
      kind: "drop",
      hue: 0,
    };
    this.pool.push(p);
    this.live += 1;
    return p;
  }

  private spawn(
    kind: Kind,
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    hue = 0,
  ) {
    const p = this.alloc();
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = vx;
    p.vy = vy;
    p.life = life;
    p.max = life;
    p.size = size;
    p.hue = hue;
  }

  step(dt: number, world: World, params: Params, cap: number) {
    const { cx, fallW, lipY, poolY, trickleX, trickleW } = world;
    const rate = lerp(40, 420, params.flow) * (cap / 1800);
    this.spawnAcc += rate * dt;
    const rng = Math.random;
    while (this.spawnAcc > 1 && this.live < cap) {
      this.spawnAcc -= 1;
      const main = rng() > 0.16;
      const x0 = main ? cx : trickleX;
      const w0 = main ? fallW : trickleW;
      const x = x0 + (rng() - 0.5) * w0 * 0.9;
      this.spawn(
        "drop",
        x,
        lipY + rng() * 6,
        params.wind * 18 + (rng() - 0.5) * 12 * params.turbulence,
        lerp(180, 420, params.flow) + rng() * 80,
        lerp(0.7, 1.6, rng()),
        lerp(0.7, 2.4, rng() * params.flow),
      );
      if (rng() < params.foam * 0.25) {
        this.spawn(
          "foam",
          x0 + (rng() - 0.5) * w0,
          lipY + 2,
          (rng() - 0.5) * 20,
          rng() * 20,
          0.35 + rng() * 0.3,
          2 + rng() * 3,
        );
      }
    }

    if (params.weather > 0.62) {
      this.weatherAcc += lerp(20, 180, params.weather) * dt;
      while (this.weatherAcc > 1 && this.live < cap) {
        this.weatherAcc -= 1;
        this.spawn(
          "rain",
          rng() * world.w,
          rng() * world.h * 0.4,
          params.wind * 80 + 20,
          lerp(420, 760, params.weather),
          0.6,
          1.1,
        );
      }
    }

    const season = params.season;
    const autumn = season > 0.42 && season < 0.68;
    const winter = season > 0.68 || season < 0.05;
    if (autumn && params.vegetation > 0.3) {
      this.leafAcc += 3 * dt * params.vegetation;
      while (this.leafAcc > 1 && this.live < cap) {
        this.leafAcc -= 1;
        this.spawn(
          "leaf",
          rng() * world.w,
          rng() * world.h * 0.35,
          params.wind * 30 + (rng() - 0.5) * 20,
          lerp(16, 46, rng()),
          6 + rng() * 5,
          3 + rng() * 3,
          rng(),
        );
      }
    }
    if (winter && params.weather < 0.75) {
      this.leafAcc += 8 * dt;
      while (this.leafAcc > 1 && this.live < cap) {
        this.leafAcc -= 1;
        this.spawn(
          "snow",
          rng() * world.w,
          -6,
          params.wind * 22 + (rng() - 0.5) * 12,
          lerp(18, 42, rng()),
          8 + rng() * 6,
          1.4 + rng() * 1.8,
        );
      }
    }

    const g = 980;
    let i = 0;
    while (i < this.live) {
      const p = this.pool[i]!;
      p.life -= dt;
      const turb =
        (fbm(p.x * 0.02, p.y * 0.015 + p.life, params.seed, 2) - 0.5) *
        params.turbulence;
      if (p.kind === "drop") {
        p.vx += (params.wind * 70 + turb * 140) * dt;
        p.vy += g * 0.55 * dt;
        if (p.y >= poolY && p.vy > 0) {
          p.kind = "splash";
          p.vy = -lerp(40, 160, params.flow) * (0.4 + Math.random() * 0.6);
          p.vx += (Math.random() - 0.5) * 80;
          p.life = 0.35 + Math.random() * 0.25;
          p.max = p.life;
          p.size *= 1.4;
          if (Math.random() < params.mist * 0.5 && this.live < cap) {
            this.spawn(
              "mist",
              p.x,
              poolY,
              (Math.random() - 0.5) * 30 + params.wind * 20,
              -lerp(12, 40, params.mist),
              lerp(1.4, 3.2, Math.random()),
              lerp(8, 26, Math.random()),
            );
          }
        }
      } else if (p.kind === "splash") {
        p.vy += g * 0.4 * dt;
        p.vx *= 0.99;
      } else if (p.kind === "mist") {
        p.vx += params.wind * 18 * dt;
        p.vy += -8 * dt;
        p.size += 10 * dt;
      } else if (p.kind === "foam") {
        p.vy += 40 * dt;
      } else if (p.kind === "leaf") {
        p.vx += Math.sin(p.life * 3 + p.hue * 10) * 18 * dt;
        p.vy = Math.max(12, p.vy);
      } else if (p.kind === "snow") {
        p.vx += Math.sin(p.life * 2 + p.x) * 10 * dt + params.wind * 8 * dt;
      } else if (p.kind === "rain") {
        p.vy += 200 * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.life <= 0 || p.y > world.h + 20 || p.x < -40 || p.x > world.w + 40) {
        this.live -= 1;
        this.pool[i] = this.pool[this.live]!;
        this.pool[this.live] = p;
        continue;
      }
      i += 1;
    }
  }

  draw(ctx: CanvasRenderingContext2D, world: World, params: Params, time: number) {
    drawSheet(ctx, world, params, time, "main");
    if (world.trickleX > 20) drawSheet(ctx, world, params, time, "trickle");
    drawLipFoam(ctx, world, params, time);
    this.drawParticles(ctx, params);
    drawImpact(ctx, world, params, time);
  }

  private drawParticles(ctx: CanvasRenderingContext2D, params: Params) {
    for (let i = 0; i < this.live; i++) {
      const p = this.pool[i]!;
      const a = clamp(p.life / p.max, 0, 1);
      if (p.kind === "drop") {
        ctx.fillStyle = rgba([226, 238, 242], 0.22 + a * 0.35);
        ctx.fillRect(p.x, p.y, p.size * 0.45, p.size * 3.2);
      } else if (p.kind === "splash") {
        ctx.fillStyle = rgba([240, 248, 252], 0.35 * a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "mist") {
        ctx.fillStyle = rgba([228, 234, 236], 0.045 * a * params.mist);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "foam") {
        ctx.fillStyle = rgba([248, 252, 255], 0.4 * a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "leaf") {
        const col: RGB = mixRgb([186, 92, 32], [214, 150, 48], p.hue);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 1.4 + p.hue);
        ctx.fillStyle = rgba(col, 0.75 * a);
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else if (p.kind === "snow") {
        ctx.fillStyle = rgba([246, 248, 252], 0.75 * a);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.kind === "rain") {
        ctx.strokeStyle = rgba([190, 210, 220], 0.35);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.stroke();
      }
    }
  }
}

function sheetSides(
  world: World,
  params: Params,
  time: number,
  which: "main" | "trickle",
  steps: number,
) {
  const cx = which === "main" ? world.cx : world.trickleX;
  const fw = which === "main" ? world.fallW : world.trickleW;
  const left: { x: number; y: number }[] = [];
  const right: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = lerp(world.lipY, world.poolY, t);
    const nL = fbm(cx * 0.01, y * 0.01 + time * 1.35, params.seed, 3);
    const nR = fbm(cx * 0.01 + 6.1, y * 0.01 + time * 1.35, params.seed, 3);
    const wind = params.wind * t * t * world.w * 0.035;
    const taper = 1 + t * lerp(0.15, 0.55, params.flow);
    const turb = params.turbulence * fw * 0.55;
    left.push({
      x: cx - (fw * 0.5) * taper + (nL - 0.5) * turb + wind,
      y,
    });
    right.push({
      x: cx + (fw * 0.5) * taper + (nR - 0.5) * turb + wind,
      y,
    });
  }
  return { left, right, cx, fw };
}

function drawSheet(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  time: number,
  which: "main" | "trickle",
) {
  const steps = which === "main" ? 42 : 24;
  const { left, right, cx } = sheetSides(world, params, time, which, steps);
  const flowA = which === "main" ? lerp(0.16, 0.42, params.flow) : 0.55;
  const alphaMul = which === "main" ? 1 : 0.55;

  ctx.beginPath();
  ctx.moveTo(left[0]!.x, left[0]!.y);
  for (const p of left) ctx.lineTo(p.x, p.y);
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i]!.x, right[i]!.y);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, world.lipY, 0, world.poolY);
  grad.addColorStop(0, rgba([236, 246, 250], 0.55 * flowA * alphaMul + 0.08));
  grad.addColorStop(0.45, rgba([186, 214, 222], 0.32 * flowA * alphaMul));
  grad.addColorStop(1, rgba([210, 228, 234], 0.12 * flowA * alphaMul));
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.globalCompositeOperation = "lighter";
  ctx.strokeStyle = rgba([255, 255, 255], 0.08 + params.flow * 0.08);
  ctx.lineWidth = which === "main" ? 1.2 : 0.8;
  const streaks = which === "main" ? 14 : 6;
  for (let s = 0; s < streaks; s++) {
    const u = (s + 0.5) / streaks;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(left[i]!.x, right[i]!.x, u);
      const y = left[i]!.y;
      const wob =
        (fbm(cx * 0.02 + s, y * 0.04 + time * 2.2, params.seed, 2) - 0.5) *
        params.turbulence *
        10;
      if (i === 0) ctx.moveTo(x + wob, y);
      else ctx.lineTo(x + wob, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawLipFoam(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  time: number,
) {
  const { cx, fallW, lipY } = world;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const x = cx + (u - 0.5) * fallW * 1.05;
    const bob = Math.sin(time * 6 + i) * 1.4;
    ctx.fillStyle = rgba([248, 252, 255], 0.35 + params.foam * 0.35);
    ctx.beginPath();
    ctx.ellipse(
      x,
      lipY + bob,
      lerp(3, 8, params.foam) * (0.6 + Math.sin(time * 4 + i) * 0.2),
      3,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}

function drawImpact(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  time: number,
) {
  const { poolX, poolY, fallW } = world;
  const pulse = 0.75 + Math.sin(time * 9) * 0.25;
  ctx.fillStyle = rgba([244, 250, 252], 0.22 * params.foam * pulse);
  ctx.beginPath();
  ctx.ellipse(
    poolX + params.wind * 10,
    poolY + 4,
    fallW * lerp(0.7, 1.4, params.flow) * pulse,
    7 * pulse,
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
}

export function paintRainbow(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
) {
  const sky = sampleSky(params.timeOfDay, params.weather);
  if (!sky.isDay || sky.sunGlow < 0.15) return;
  const strength =
    params.rainbow * params.mist * (1 - params.weather * 0.5) * sky.sunGlow;
  if (strength < 0.05) return;
  const { cx, lipY, poolY, w } = world;
  const r = (poolY - lipY) * 1.15;
  const x = cx + w * 0.08;
  const y = lipY + (poolY - lipY) * 0.35;
  const bands: RGB[] = [
    [196, 72, 72],
    [210, 140, 60],
    [214, 198, 80],
    [86, 166, 92],
    [80, 140, 196],
    [120, 96, 176],
  ];
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  bands.forEach((c, i) => {
    ctx.strokeStyle = rgba(c, 0.14 * strength);
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(x, y, r - i * 8, Math.PI * 0.95, Math.PI * 1.55);
    ctx.stroke();
  });
  ctx.restore();
}

export function qualityCap(w: number, h: number, narrow: boolean) {
  const area = w * h;
  if (narrow || area < 500_000) return 900;
  if (area < 1_200_000) return 1600;
  return 2200;
}


