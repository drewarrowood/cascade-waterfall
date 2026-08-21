import { fbm, hash2, lerp, mulberry32, clamp } from "./noise";
import {
  mixRgb,
  moonPosition,
  rgb,
  rgba,
  rockColor,
  sampleSeason,
  sampleSky,
  shade,
  sunPosition,
  type RGB,
  type Season,
  type Sky,
} from "./palette";
import type { Params, World } from "./types";

export interface TerrainCache {
  canvas: HTMLCanvasElement;
  key: string;
}

export function terrainKey(p: Params, w: number, h: number, narrow: boolean) {
  return [
    w | 0,
    h | 0,
    narrow ? 1 : 0,
    p.drop,
    p.width,
    p.vegetation,
    p.rockWarmth,
    p.season,
    p.seed,
    p.flow,
  ]
    .map((n) => (typeof n === "number" ? n.toFixed(3) : n))
    .join("|");
}

export function skylineY(x: number, world: World, seed: number) {
  const { w, h, cx, fallW, lipY } = world;
  const left = cx - fallW * 0.52;
  const right = cx + fallW * 0.52;
  const n = fbm(x * 0.0032, seed * 0.01, seed, 5);
  if (x < left) {
    const t = clamp(x / Math.max(1, left), 0, 1);
    const ridge = lerp(h * 0.16, lipY, t * t);
    return ridge + (n - 0.5) * h * 0.09;
  }
  if (x > right) {
    const t = clamp((x - right) / Math.max(1, w - right), 0, 1);
    const ridge = lerp(lipY * 0.92, h * 0.22, Math.sqrt(t));
    return ridge + (n - 0.42) * h * 0.1;
  }
  return lipY - h * 0.01;
}

export function paintSky(
  ctx: CanvasRenderingContext2D,
  world: World,
  sky: Sky,
  params: Params,
  time: number,
) {
  const { w, h } = world;
  const g = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  g.addColorStop(0, rgb(sky.zenith));
  g.addColorStop(0.55, rgb(mixRgb(sky.zenith, sky.horizon, 0.45)));
  g.addColorStop(1, rgb(sky.horizon));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  if (sky.starAlpha > 0.04) {
    ctx.fillStyle = rgba([240, 242, 255], sky.starAlpha);
    for (let i = 0; i < 160; i++) {
      const sx = hash2(i, 2.2, params.seed) * w;
      const sy = hash2(i, 9.1, params.seed) * h * 0.5;
      const tw =
        0.45 + 0.55 * Math.sin(time * (1.2 + hash2(i, 4, 1) * 2) + i);
      const r = 0.4 + hash2(i, 3, 2) * 1.3;
      ctx.globalAlpha = sky.starAlpha * tw * (0.35 + hash2(i, 1, 3));
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const sun = sunPosition(params.timeOfDay, w, h);
  if (sun.visible && sky.sunGlow > 0.05) {
    const glow = ctx.createRadialGradient(sun.x, sun.y, 2, sun.x, sun.y, h * 0.55);
    glow.addColorStop(0, rgba(sky.sun, 0.95 * sky.sunGlow));
    glow.addColorStop(0.08, rgba(sky.sun, 0.45 * sky.sunGlow));
    glow.addColorStop(0.28, rgba(sky.horizon, 0.18 * sky.sunGlow));
    glow.addColorStop(1, rgba(sky.horizon, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = rgba([255, 250, 230], 0.95);
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, lerp(6, 16, sky.sunGlow), 0, Math.PI * 2);
    ctx.fill();
  }

  const moon = moonPosition(params.timeOfDay, w, h);
  if (moon.visible) {
    const mg = ctx.createRadialGradient(
      moon.x,
      moon.y,
      2,
      moon.x,
      moon.y,
      48,
    );
    mg.addColorStop(0, rgba(sky.moon, 0.95));
    mg.addColorStop(0.4, rgba(sky.moon, 0.35));
    mg.addColorStop(1, rgba(sky.moon, 0));
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgb(sky.moon);
    ctx.beginPath();
    ctx.arc(moon.x, moon.y, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = rgba(sky.zenith, 0.55);
    ctx.beginPath();
    ctx.arc(moon.x + 4, moon.y - 2, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  paintClouds(ctx, world, sky, params, time);
}

function paintClouds(
  ctx: CanvasRenderingContext2D,
  world: World,
  sky: Sky,
  params: Params,
  time: number,
) {
  const { w, h } = world;
  const cover = lerp(0.15, 0.85, params.weather);
  const n = 5 + Math.floor(cover * 7);
  const wind = params.wind;
  ctx.save();
  for (let i = 0; i < n; i++) {
    const y = h * (0.06 + hash2(i, 1, params.seed) * 0.22);
    const drift = ((time * (4 + i) * (0.4 + wind * 0.3) + i * 80) % (w + 220)) - 80;
    const x = drift;
    const scale = 0.6 + hash2(i, 2, params.seed) * 1.1;
    ctx.globalAlpha = lerp(0.12, 0.45, cover) * (sky.isDay ? 1 : 0.35);
    ctx.fillStyle = rgba(
      mixRgb(sky.horizon, [255, 255, 255], sky.isDay ? 0.55 : 0.15),
      1,
    );
    puff(ctx, x, y, 46 * scale, 16 * scale);
    puff(ctx, x + 28 * scale, y - 8 * scale, 34 * scale, 14 * scale);
    puff(ctx, x + 54 * scale, y + 4 * scale, 40 * scale, 15 * scale);
  }
  ctx.restore();
}

function puff(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function paintMountains(
  ctx: CanvasRenderingContext2D,
  world: World,
  sky: Sky,
  params: Params,
) {
  const { w, h } = world;
  const layers = [
    { y: h * 0.38, amp: h * 0.16, mix: 0.72, seed: 1 },
    { y: h * 0.44, amp: h * 0.18, mix: 0.5, seed: 2 },
    { y: h * 0.5, amp: h * 0.2, mix: 0.28, seed: 3 },
  ];
  for (const layer of layers) {
    const col = mixRgb(sky.fog, sky.ambient, 1 - layer.mix);
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, layer.y);
    for (let x = 0; x <= w; x += 6) {
      const n = fbm(x * 0.0024 + layer.seed * 8, layer.seed, params.seed, 5);
      ctx.lineTo(x, layer.y - n * layer.amp);
    }
    ctx.lineTo(w, h);
    ctx.closePath();
    ctx.fillStyle = rgb(col);
    ctx.fill();
  }
}

export function paintTerrain(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
) {
  const season = sampleSeason(params.season);
  const rng = mulberry32(params.seed * 997);
  paintCliffs(ctx, world, params, season, rng);
  paintMidTrees(ctx, world, params, season, rng);
  paintBasin(ctx, world, params, season, rng);
  paintForeground(ctx, world, params, season, rng);
}

function paintCliffs(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  season: Season,
  rng: () => number,
) {
  const { w, h, cx, fallW, lipY, poolY } = world;
  const left = cx - fallW * 0.5;
  const right = cx + fallW * 0.5;

  const fillCliff = (side: "left" | "right") => {
    ctx.beginPath();
    if (side === "left") {
      ctx.moveTo(0, h);
      ctx.lineTo(0, 0);
      for (let x = 0; x <= left; x += 5) {
        ctx.lineTo(x, skylineY(x, world, params.seed));
      }
      const wall = 28;
      for (let i = 0; i <= wall; i++) {
        const t = i / wall;
        const y = lerp(lipY, poolY + world.poolH * 0.4, t);
        const n = fbm(2.2, y * 0.012, params.seed, 4);
        ctx.lineTo(left - (n - 0.3) * fallW * 0.45 - t * 6, y);
      }
      ctx.lineTo(0, h);
    } else {
      ctx.moveTo(w, h);
      ctx.lineTo(w, 0);
      for (let x = w; x >= right; x -= 5) {
        ctx.lineTo(x, skylineY(x, world, params.seed));
      }
      const wall = 28;
      for (let i = 0; i <= wall; i++) {
        const t = i / wall;
        const y = lerp(lipY, poolY + world.poolH * 0.4, t);
        const n = fbm(8.4, y * 0.012, params.seed, 4);
        ctx.lineTo(right + (n - 0.3) * fallW * 0.45 + t * 8, y);
      }
      ctx.lineTo(w, h);
    }
    ctx.closePath();

    const dry = rockColor(params.rockWarmth, 0.08);
    ctx.fillStyle = rgb(dry);
    ctx.fill();

    ctx.save();
    ctx.clip();
    for (let y = 0; y < h; y += 7) {
      const band = (fbm(1.4, y * 0.018, params.seed, 3) - 0.5) * 28;
      ctx.fillStyle = rgba(shade(dry, band), 0.38);
      const wobble = (fbm(y * 0.04, 4, params.seed, 2) - 0.5) * 10;
      ctx.fillRect(0, y + wobble, w, 7 + rng() * 5);
    }

    const wet = rockColor(params.rockWarmth, 0.82);
    const wetGrad = ctx.createLinearGradient(
      side === "left" ? left - 80 : right + 80,
      0,
      side === "left" ? left + 8 : right - 8,
      0,
    );
    wetGrad.addColorStop(0, rgba(wet, 0));
    wetGrad.addColorStop(1, rgba(wet, 0.72));
    ctx.fillStyle = wetGrad;
    ctx.fillRect(0, lipY - 10, w, poolY - lipY + 80);

    for (let i = 0; i < 18; i++) {
      const x0 =
        side === "left"
          ? rng() * left
          : right + rng() * (w - right);
      const y0 = lerp(lipY, h * 0.85, rng());
      ctx.strokeStyle = rgba(shade(dry, -40), 0.35);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (rng() - 0.5) * 18, y0 + 30 + rng() * 50);
      ctx.stroke();
    }

    const mossCount = Math.floor(22 * params.vegetation * (1 - season.snow * 0.7));
    for (let i = 0; i < mossCount; i++) {
      const x =
        side === "left" ? rng() * left * 0.95 : right + rng() * (w - right);
      const y = lerp(lipY + 20, h * 0.82, rng());
      ctx.fillStyle = rgba(season.moss, 0.28 + rng() * 0.35);
      ctx.beginPath();
      ctx.ellipse(x, y, 8 + rng() * 16, 5 + rng() * 8, rng() * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    if (season.snow > 0.2) {
      ctx.fillStyle = rgba([236, 240, 244], season.snow * 0.85);
      for (let x = side === "left" ? 0 : right; x < (side === "left" ? left : w); x += 4) {
        const y = skylineY(x, world, params.seed);
        const depth = 4 + fbm(x * 0.02, 9, params.seed, 2) * 10 * season.snow;
        ctx.fillRect(x, y - 1, 5, depth);
      }
    }
    ctx.restore();
  };

  fillCliff("left");
  fillCliff("right");

  ctx.fillStyle = rgb(rockColor(params.rockWarmth, 0.15));
  ctx.beginPath();
  ctx.moveTo(left - 18, lipY + 4);
  ctx.quadraticCurveTo(cx, lipY - 16 - params.drop * 10, right + 18, lipY + 4);
  ctx.quadraticCurveTo(cx, lipY + 14, left - 18, lipY + 4);
  ctx.fill();
}

function paintMidTrees(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  season: Season,
  rng: () => number,
) {
  const { w, h } = world;
  const count = Math.floor(lerp(8, 46, params.vegetation));
  const trees: { x: number; y: number; h: number; pine: boolean }[] = [];
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = skylineY(x, world, params.seed);
    const left = world.cx - world.fallW * 1.8;
    const right = world.cx + world.fallW * 1.8;
    if (x > left && x < right) continue;
    if (Math.abs(x - world.trickleX) < world.trickleW * 4) continue;
    if (y > world.lipY + world.h * 0.04) continue;
    trees.push({
      x,
      y,
      h: lerp(h * 0.035, h * 0.11, rng()),
      pine: rng() > 0.42,
    });
  }
  trees.sort((a, b) => a.y - b.y);
  for (const t of trees) {
    if (t.pine) drawPine(ctx, t.x, t.y, t.h, season, rng);
    else drawDeciduous(ctx, t.x, t.y, t.h, season, rng);
  }
}

function drawPine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ht: number,
  season: Season,
  rng: () => number,
) {
  ctx.strokeStyle = rgb(season.trunk);
  ctx.lineWidth = Math.max(1.2, ht * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - ht);
  ctx.stroke();
  const layers = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1);
    const yy = y - lerp(ht * 0.15, ht, t);
    const ww = lerp(ht * 0.42, ht * 0.08, t) * (0.8 + rng() * 0.3);
    ctx.fillStyle = rgb(
      mixRgb(season.leafB, season.leafA, t * 0.6 + rng() * 0.2),
    );
    ctx.beginPath();
    ctx.moveTo(x, yy - ht * 0.12);
    ctx.lineTo(x - ww, yy + ht * 0.08);
    ctx.lineTo(x + ww, yy + ht * 0.08);
    ctx.closePath();
    ctx.fill();
  }
  if (season.snow > 0.4) {
    ctx.fillStyle = rgba([240, 244, 248], season.snow * 0.8);
    ctx.beginPath();
    ctx.moveTo(x, y - ht);
    ctx.lineTo(x - ht * 0.12, y - ht * 0.86);
    ctx.lineTo(x + ht * 0.12, y - ht * 0.86);
    ctx.closePath();
    ctx.fill();
  }
}

function drawDeciduous(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  ht: number,
  season: Season,
  rng: () => number,
) {
  const trunk = rgb(season.trunk);
  ctx.strokeStyle = trunk;
  ctx.lineCap = "round";
  const branch = (
    x0: number,
    y0: number,
    len: number,
    ang: number,
    depth: number,
  ) => {
    const x1 = x0 + Math.cos(ang) * len;
    const y1 = y0 + Math.sin(ang) * len;
    ctx.lineWidth = Math.max(0.8, depth * 1.3);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    if (depth <= 1) {
      if (season.bare < 0.75) {
        ctx.fillStyle = rgba(
          mixRgb(season.leafA, season.leafB, rng()),
          0.55 * (1 - season.bare),
        );
        ctx.beginPath();
        ctx.arc(x1, y1, len * (0.7 + rng() * 0.5), 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }
    branch(x1, y1, len * 0.7, ang - 0.45 - rng() * 0.2, depth - 1);
    branch(x1, y1, len * 0.68, ang + 0.4 + rng() * 0.25, depth - 1);
  };
  branch(x, y, ht * 0.38, -Math.PI / 2, 3);
  if (season.name === "Spring" && rng() > 0.55) {
    ctx.fillStyle = rgba(season.flower, 0.55);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.arc(
        x + (rng() - 0.5) * ht * 0.5,
        y - ht * 0.4 - rng() * ht * 0.4,
        1.6,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}

function paintBasin(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  season: Season,
  rng: () => number,
) {
  const { poolX, poolY, poolW, poolH, h, w } = world;
  const rock = rockColor(params.rockWarmth, 0.4);
  ctx.fillStyle = rgb(shade(rock, -20));
  ctx.beginPath();
  ctx.ellipse(poolX, poolY + poolH * 0.55, poolW * 0.72, poolH * 1.15, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 10; i++) {
    const ang = rng() * Math.PI * 2;
    const rad = lerp(0.45, 0.85, rng());
    const x = poolX + Math.cos(ang) * poolW * rad * 0.7;
    const y = poolY + poolH * 0.4 + Math.sin(ang) * poolH * rad;
    boulder(ctx, x, y, lerp(8, 22, rng()), rock, rng);
  }

  ctx.fillStyle = rgb(mixRgb(season.grass, rock, 0.3));
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 8) {
    const n = fbm(x * 0.01, 12, params.seed, 3);
    const bank = poolY + poolH * 0.9 + n * 18;
    ctx.lineTo(x, bank);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

function boulder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: RGB,
  rng: () => number,
) {
  ctx.fillStyle = rgb(shade(col, rng() * 20 - 16));
  ctx.beginPath();
  const n = 6 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.7 + rng() * 0.4);
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr * 0.72;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function paintForeground(
  ctx: CanvasRenderingContext2D,
  world: World,
  params: Params,
  season: Season,
  rng: () => number,
) {
  const { w, h } = world;
  const ferns = Math.floor(lerp(4, 18, params.vegetation));
  for (let i = 0; i < ferns; i++) {
    const x = rng() * w;
    const y = lerp(h * 0.84, h * 0.98, rng());
    drawFern(ctx, x, y, lerp(18, 42, rng()), season, rng);
  }
  const rocks = 6;
  for (let i = 0; i < rocks; i++) {
    boulder(
      ctx,
      rng() * w,
      lerp(h * 0.88, h * 0.99, rng()),
      lerp(14, 36, rng()),
      rockColor(params.rockWarmth, 0.2),
      rng,
    );
  }
  if (params.vegetation > 0.35) {
    for (let i = 0; i < 8; i++) {
      drawGrassTuft(
        ctx,
        rng() * w,
        lerp(h * 0.86, h, rng()),
        season,
        rng,
      );
    }
  }
}

function drawFern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  season: Season,
  rng: () => number,
) {
  const ang = -Math.PI / 2 + (rng() - 0.5) * 0.8;
  ctx.strokeStyle = rgb(season.moss);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  const x2 = x + Math.cos(ang) * len;
  const y2 = y + Math.sin(ang) * len;
  ctx.quadraticCurveTo(
    x + Math.cos(ang + 0.4) * len * 0.5,
    y + Math.sin(ang) * len * 0.4,
    x2,
    y2,
  );
  ctx.stroke();
  const leaflets = 7;
  for (let i = 1; i < leaflets; i++) {
    const t = i / leaflets;
    const px = lerp(x, x2, t);
    const py = lerp(y, y2, t);
    ctx.strokeStyle = rgba(season.leafA, 0.8);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(ang + 1.1) * (8 * (1 - t)), py + Math.sin(ang + 1.1) * 4);
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(ang - 1.1) * (8 * (1 - t)), py + Math.sin(ang - 1.1) * 4);
    ctx.stroke();
  }
}

function drawGrassTuft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  season: Season,
  rng: () => number,
) {
  ctx.strokeStyle = rgb(season.grass);
  ctx.lineWidth = 1;
  ctx.lineCap = "round";
  for (let i = 0; i < 7; i++) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(
      x + (rng() - 0.5) * 6,
      y - 10,
      x + (rng() - 0.5) * 14,
      y - lerp(10, 22, rng()),
    );
    ctx.stroke();
  }
}

export function paintPoolWater(
  ctx: CanvasRenderingContext2D,
  world: World,
  sky: Sky,
  params: Params,
  time: number,
) {
  const { poolX, poolY, poolW, poolH, fallW } = world;
  const body = mixRgb([18, 48, 58], sky.horizon, 0.22);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(poolX, poolY + poolH * 0.2, poolW * 0.62, poolH * 0.85, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgb(body);
  ctx.fill();
  ctx.clip();

  const reflect = ctx.createLinearGradient(0, poolY - 10, 0, poolY + poolH);
  reflect.addColorStop(0, rgba(sky.horizon, 0.35));
  reflect.addColorStop(1, rgba(body, 0.1));
  ctx.fillStyle = reflect;
  ctx.fillRect(poolX - poolW, poolY - 20, poolW * 2, poolH * 2);

  ctx.globalAlpha = 0.35;
  ctx.fillStyle = rgba([210, 230, 235], 0.25);
  const band = fallW * 0.7;
  ctx.fillRect(
    poolX - band / 2 + Math.sin(time * 1.3) * 6,
    poolY - 4,
    band,
    poolH * 1.4,
  );

  ctx.globalAlpha = 0.45;
  ctx.strokeStyle = rgba([220, 236, 240], 0.18);
  ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) {
    const phase = time * (0.6 + i * 0.15) + i;
    const rr = ((phase % 1) * poolW * 0.35);
    ctx.beginPath();
    ctx.ellipse(
      poolX + params.wind * 8,
      poolY + 8,
      Math.max(4, rr),
      Math.max(2, rr * 0.28),
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  }
  ctx.restore();
}

export function paintGodRays(
  ctx: CanvasRenderingContext2D,
  world: World,
  sky: Sky,
  params: Params,
) {
  if (sky.sunGlow < 0.25 || params.mist < 0.2) return;
  const sun = sunPosition(params.timeOfDay, world.w, world.h);
  if (!sun.visible) return;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const rays = 7;
  for (let i = 0; i < rays; i++) {
    const ang =
      Math.atan2(world.poolY - sun.y, world.cx - sun.x) + (i - 3) * 0.07;
    const len = world.h * 0.85;
    ctx.fillStyle = rgba(sky.sun, 0.035 + sky.sunGlow * 0.04);
    ctx.beginPath();
    ctx.moveTo(sun.x, sun.y);
    ctx.lineTo(
      sun.x + Math.cos(ang - 0.018) * len,
      sun.y + Math.sin(ang - 0.018) * len,
    );
    ctx.lineTo(
      sun.x + Math.cos(ang + 0.018) * len,
      sun.y + Math.sin(ang + 0.018) * len,
    );
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export function paintVignette(
  ctx: CanvasRenderingContext2D,
  world: World,
  sky: Sky,
) {
  const { w, h } = world;
  const g = ctx.createRadialGradient(
    w * 0.45,
    h * 0.42,
    h * 0.15,
    w * 0.5,
    h * 0.5,
    h * 0.78,
  );
  g.addColorStop(0, rgba([0, 0, 0], 0));
  g.addColorStop(1, rgba([8, 10, 14], sky.isDay ? 0.28 : 0.48));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = "soft-light";
  ctx.fillStyle = rgba(sky.grade, 0.28);
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = "source-over";
}
