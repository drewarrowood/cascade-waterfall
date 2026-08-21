import { lerp } from "./noise";

export interface Params {
  flow: number;
  width: number;
  drop: number;
  wind: number;
  turbulence: number;
  mist: number;
  foam: number;
  rainbow: number;
  timeOfDay: number;
  season: number;
  weather: number;
  vegetation: number;
  rockWarmth: number;
  seed: number;
  liveSky: boolean;
  wildlife: boolean;
}

export interface World {
  w: number;
  h: number;
  cx: number;
  fallW: number;
  lipY: number;
  poolY: number;
  poolX: number;
  poolW: number;
  poolH: number;
  trickleX: number;
  trickleW: number;
  narrow: boolean;
}

export const DEFAULT_PARAMS: Params = {
  flow: 0.72,
  width: 0.5,
  drop: 0.78,
  wind: 0.14,
  turbulence: 0.42,
  mist: 0.58,
  foam: 0.68,
  rainbow: 0.4,
  timeOfDay: 17.15,
  season: 0.3,
  weather: 0.1,
  vegetation: 0.72,
  rockWarmth: 0.48,
  seed: 7,
  liveSky: false,
  wildlife: true,
};

export function layoutWorld(
  w: number,
  h: number,
  p: Params,
  narrow: boolean,
): World {
  const cx = (narrow ? 0.5 : 0.37) * w;
  const fallW = lerp(w * 0.032, w * 0.145, p.width);
  const lipY = lerp(h * 0.11, h * 0.3, 1 - p.drop);
  const poolY = lerp(h * 0.66, h * 0.78, 0.35 + p.drop * 0.35);
  const poolW = fallW * lerp(2.6, 4.8, p.flow) + w * 0.07;
  const poolH = h * lerp(0.055, 0.085, p.flow);
  const trickleX = cx - fallW * 1.55 - w * 0.018;
  const trickleW = Math.max(2, fallW * 0.2);
  return {
    w,
    h,
    cx,
    fallW,
    lipY,
    poolY,
    poolX: cx + p.wind * w * 0.02,
    poolW,
    poolH,
    trickleX,
    trickleW,
    narrow,
  };
}

export function randomParams(seed = Math.floor(Math.random() * 9999)): Params {
  const rng = () => Math.random();
  const weather = rng() * 0.85;
  const mist = lerp(0.25, 0.9, rng());
  const timeOfDay = rng() * 24;
  const isDay = timeOfDay > 6 && timeOfDay < 18.5;
  return {
    flow: lerp(0.28, 0.95, rng()),
    width: lerp(0.18, 0.9, rng()),
    drop: lerp(0.35, 0.95, rng()),
    wind: lerp(-0.7, 0.7, rng()),
    turbulence: lerp(0.15, 0.8, rng()),
    mist,
    foam: lerp(0.3, 0.9, rng()),
    rainbow: isDay && weather < 0.45 ? lerp(0.15, 0.85, rng()) : rng() * 0.15,
    timeOfDay,
    season: rng(),
    weather,
    vegetation: lerp(0.15, 0.95, rng()),
    rockWarmth: rng(),
    seed,
    liveSky: false,
    wildlife: rng() > 0.25,
  };
}
