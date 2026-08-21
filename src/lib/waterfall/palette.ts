import { clamp, lerp, wrap24 } from "./noise";
import type { Params } from "./types";

export type RGB = [number, number, number];

export function mixRgb(a: RGB, b: RGB, t: number): RGB {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

export function rgb(c: RGB) {
  return `rgb(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0})`;
}

export function rgba(c: RGB, a: number) {
  return `rgba(${c[0] | 0}, ${c[1] | 0}, ${c[2] | 0}, ${clamp(a, 0, 1)})`;
}

export function shade(c: RGB, d: number): RGB {
  return [
    clamp(c[0] + d, 0, 255),
    clamp(c[1] + d, 0, 255),
    clamp(c[2] + d, 0, 255),
  ];
}

export interface Sky {
  zenith: RGB;
  horizon: RGB;
  fog: RGB;
  sun: RGB;
  moon: RGB;
  ambient: RGB;
  grade: RGB;
  sunGlow: number;
  starAlpha: number;
  isDay: boolean;
}

interface SkyKey {
  t: number;
  sky: Omit<Sky, "isDay">;
}

const KEYS: SkyKey[] = [
  {
    t: 0,
    sky: {
      zenith: [6, 8, 22],
      horizon: [16, 20, 38],
      fog: [18, 22, 40],
      sun: [255, 214, 170],
      moon: [230, 232, 240],
      ambient: [28, 34, 52],
      grade: [20, 28, 58],
      sunGlow: 0,
      starAlpha: 0.95,
    },
  },
  {
    t: 5.1,
    sky: {
      zenith: [18, 24, 52],
      horizon: [70, 50, 72],
      fog: [48, 40, 62],
      sun: [255, 176, 110],
      moon: [230, 232, 240],
      ambient: [48, 42, 62],
      grade: [48, 36, 64],
      sunGlow: 0.15,
      starAlpha: 0.45,
    },
  },
  {
    t: 6.6,
    sky: {
      zenith: [72, 96, 158],
      horizon: [255, 158, 92],
      fog: [210, 150, 120],
      sun: [255, 196, 120],
      moon: [230, 232, 240],
      ambient: [186, 132, 96],
      grade: [255, 150, 80],
      sunGlow: 0.85,
      starAlpha: 0,
    },
  },
  {
    t: 9.5,
    sky: {
      zenith: [88, 152, 214],
      horizon: [188, 214, 230],
      fog: [176, 198, 214],
      sun: [255, 236, 196],
      moon: [230, 232, 240],
      ambient: [168, 186, 176],
      grade: [186, 210, 220],
      sunGlow: 0.55,
      starAlpha: 0,
    },
  },
  {
    t: 12.5,
    sky: {
      zenith: [54, 132, 196],
      horizon: [186, 218, 232],
      fog: [170, 196, 210],
      sun: [255, 248, 220],
      moon: [230, 232, 240],
      ambient: [164, 178, 168],
      grade: [200, 214, 210],
      sunGlow: 0.4,
      starAlpha: 0,
    },
  },
  {
    t: 16.4,
    sky: {
      zenith: [78, 132, 186],
      horizon: [226, 196, 150],
      fog: [196, 176, 140],
      sun: [255, 210, 140],
      moon: [230, 232, 240],
      ambient: [186, 156, 118],
      grade: [232, 176, 110],
      sunGlow: 0.7,
      starAlpha: 0,
    },
  },
  {
    t: 18.1,
    sky: {
      zenith: [48, 62, 110],
      horizon: [255, 128, 64],
      fog: [210, 118, 78],
      sun: [255, 170, 90],
      moon: [230, 232, 240],
      ambient: [186, 110, 72],
      grade: [255, 130, 64],
      sunGlow: 1,
      starAlpha: 0.05,
    },
  },
  {
    t: 20.2,
    sky: {
      zenith: [16, 20, 48],
      horizon: [78, 46, 62],
      fog: [42, 32, 52],
      sun: [255, 170, 110],
      moon: [230, 232, 240],
      ambient: [42, 40, 58],
      grade: [36, 32, 58],
      sunGlow: 0.08,
      starAlpha: 0.7,
    },
  },
  {
    t: 24,
    sky: {
      zenith: [6, 8, 22],
      horizon: [16, 20, 38],
      fog: [18, 22, 40],
      sun: [255, 214, 170],
      moon: [230, 232, 240],
      ambient: [28, 34, 52],
      grade: [20, 28, 58],
      sunGlow: 0,
      starAlpha: 0.95,
    },
  },
];

function lerpSky(a: SkyKey["sky"], b: SkyKey["sky"], t: number): SkyKey["sky"] {
  return {
    zenith: mixRgb(a.zenith, b.zenith, t),
    horizon: mixRgb(a.horizon, b.horizon, t),
    fog: mixRgb(a.fog, b.fog, t),
    sun: mixRgb(a.sun, b.sun, t),
    moon: mixRgb(a.moon, b.moon, t),
    ambient: mixRgb(a.ambient, b.ambient, t),
    grade: mixRgb(a.grade, b.grade, t),
    sunGlow: lerp(a.sunGlow, b.sunGlow, t),
    starAlpha: lerp(a.starAlpha, b.starAlpha, t),
  };
}

export function sampleSky(timeOfDay: number, weather: number): Sky {
  const t = wrap24(timeOfDay);
  let i = 0;
  while (i < KEYS.length - 1 && KEYS[i + 1]!.t < t) i += 1;
  const a = KEYS[i]!;
  const b = KEYS[i + 1] ?? KEYS[0]!;
  const span = b.t - a.t || 1;
  const u = clamp((t - a.t) / span, 0, 1);
  const s = lerpSky(a.sky, b.sky, u);
  const overcast: RGB = [118, 124, 132];
  const k = weather * 0.78;
  return {
    zenith: mixRgb(s.zenith, mixRgb(s.zenith, overcast, 0.55), k),
    horizon: mixRgb(s.horizon, mixRgb(s.horizon, overcast, 0.7), k),
    fog: mixRgb(s.fog, [140, 144, 150], k),
    sun: s.sun,
    moon: s.moon,
    ambient: mixRgb(s.ambient, [110, 114, 118], k),
    grade: mixRgb(s.grade, [120, 124, 128], k * 0.6),
    sunGlow: s.sunGlow * (1 - weather * 0.85),
    starAlpha: s.starAlpha * (1 - weather * 0.7),
    isDay: t > 5.8 && t < 19.6,
  };
}

export interface Season {
  name: string;
  leafA: RGB;
  leafB: RGB;
  moss: RGB;
  grass: RGB;
  trunk: RGB;
  flower: RGB;
  snow: number;
  bare: number;
}

const SEASONS: { at: number; s: Season }[] = [
  {
    at: 0,
    s: {
      name: "Spring",
      leafA: [126, 176, 92],
      leafB: [92, 150, 78],
      moss: [78, 122, 64],
      grass: [96, 140, 72],
      trunk: [86, 64, 48],
      flower: [232, 168, 186],
      snow: 0,
      bare: 0.08,
    },
  },
  {
    at: 0.25,
    s: {
      name: "Summer",
      leafA: [62, 128, 72],
      leafB: [42, 102, 58],
      moss: [58, 108, 60],
      grass: [70, 118, 62],
      trunk: [74, 56, 42],
      flower: [214, 196, 92],
      snow: 0,
      bare: 0,
    },
  },
  {
    at: 0.5,
    s: {
      name: "Autumn",
      leafA: [196, 108, 42],
      leafB: [168, 64, 32],
      moss: [96, 92, 48],
      grass: [128, 102, 48],
      trunk: [72, 50, 36],
      flower: [214, 86, 36],
      snow: 0,
      bare: 0.25,
    },
  },
  {
    at: 0.75,
    s: {
      name: "Winter",
      leafA: [168, 176, 170],
      leafB: [120, 132, 128],
      moss: [86, 96, 88],
      grass: [110, 118, 108],
      trunk: [70, 62, 56],
      flower: [210, 214, 218],
      snow: 0.85,
      bare: 0.92,
    },
  },
  {
    at: 1,
    s: {
      name: "Spring",
      leafA: [126, 176, 92],
      leafB: [92, 150, 78],
      moss: [78, 122, 64],
      grass: [96, 140, 72],
      trunk: [86, 64, 48],
      flower: [232, 168, 186],
      snow: 0,
      bare: 0.08,
    },
  },
];

function lerpSeason(a: Season, b: Season, t: number): Season {
  return {
    name: t < 0.5 ? a.name : b.name,
    leafA: mixRgb(a.leafA, b.leafA, t),
    leafB: mixRgb(a.leafB, b.leafB, t),
    moss: mixRgb(a.moss, b.moss, t),
    grass: mixRgb(a.grass, b.grass, t),
    trunk: mixRgb(a.trunk, b.trunk, t),
    flower: mixRgb(a.flower, b.flower, t),
    snow: lerp(a.snow, b.snow, t),
    bare: lerp(a.bare, b.bare, t),
  };
}

export function sampleSeason(season: number): Season {
  const t = ((season % 1) + 1) % 1;
  let i = 0;
  while (i < SEASONS.length - 1 && SEASONS[i + 1]!.at < t) i += 1;
  const a = SEASONS[i]!;
  const b = SEASONS[i + 1] ?? SEASONS[0]!;
  const span = b.at - a.at || 1;
  return lerpSeason(a.s, b.s, clamp((t - a.at) / span, 0, 1));
}

export function rockColor(warmth: number, wet: number): RGB {
  const cool: RGB = [92, 102, 112];
  const warm: RGB = [148, 118, 88];
  const base = mixRgb(cool, warm, warmth);
  const wetCol: RGB = [42, 52, 58];
  return mixRgb(base, wetCol, wet);
}

export function waterBody(sky: Sky): RGB {
  return mixRgb([28, 58, 68], sky.horizon, 0.28);
}

export function timeLabel(hour: number) {
  const h = wrap24(hour);
  const hi = Math.floor(h);
  const m = Math.floor((h - hi) * 60);
  const period = hi >= 12 ? "PM" : "AM";
  const h12 = hi % 12 === 0 ? 12 : hi % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function weatherLabel(w: number) {
  if (w < 0.18) return "Clear";
  if (w < 0.4) return "Haze";
  if (w < 0.68) return "Overcast";
  if (w < 0.86) return "Rain";
  return "Storm";
}

export function sunPosition(timeOfDay: number, w: number, h: number) {
  const t = wrap24(timeOfDay);
  const visible = t > 5.2 && t < 19.8;
  const u = clamp((t - 5.2) / 14.6, 0, 1);
  return {
    x: lerp(w * 0.08, w * 0.92, u),
    y: h * (0.46 - Math.sin(u * Math.PI) * 0.34),
    visible,
    u,
  };
}

export function moonPosition(timeOfDay: number, w: number, h: number) {
  const t = wrap24(timeOfDay + 12);
  const u = clamp((t - 5.2) / 14.6, 0, 1);
  const night = wrap24(timeOfDay) < 6.2 || wrap24(timeOfDay) > 18.8;
  return {
    x: lerp(w * 0.1, w * 0.9, u),
    y: h * (0.42 - Math.sin(u * Math.PI) * 0.28),
    visible: night,
  };
}

export function clockPhrase(p: Params) {
  const t = wrap24(p.timeOfDay);
  if (t < 5) return "Deep night";
  if (t < 6.4) return "First light";
  if (t < 8) return "Sunrise";
  if (t < 11) return "Morning";
  if (t < 14) return "Midday";
  if (t < 16.5) return "Afternoon";
  if (t < 18.4) return "Golden hour";
  if (t < 20) return "Dusk";
  if (t < 22) return "Nightfall";
  return "Starlight";
}
