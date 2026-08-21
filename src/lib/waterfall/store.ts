import { create } from "zustand";
import { DEFAULT_PARAMS, randomParams, type Params } from "./types";
import { PRESETS } from "./presets";

const STORAGE_KEY = "cascade.v1";

function readSaved(): Partial<Params> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<Params>;
  } catch {
    return null;
  }
}

function writeSaved(params: Params, muted: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...params, muted }));
  } catch {
    /* ignore quota */
  }
}

export interface CascadeState {
  params: Params;
  muted: boolean;
  entered: boolean;
  panelOpen: boolean;
  presetId: string | null;
  setParam: <K extends keyof Params>(key: K, value: Params[K]) => void;
  setParams: (params: Params) => void;
  applyPreset: (id: string) => void;
  randomize: () => void;
  reshuffle: () => void;
  reset: () => void;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
  enter: () => void;
  setPanelOpen: (open: boolean) => void;
  hydrate: () => void;
}

export const useCascade = create<CascadeState>((set, get) => ({
  params: { ...DEFAULT_PARAMS },
  muted: false,
  entered: false,
  panelOpen: false,
  presetId: "golden",
  setParam: (key, value) => {
    const params = { ...get().params, [key]: value };
    set({ params, presetId: null });
    writeSaved(params, get().muted);
  },
  setParams: (params) => {
    set({ params, presetId: null });
    writeSaved(params, get().muted);
  },
  applyPreset: (id) => {
    const preset = PRESETS.find((p) => p.id === id);
    if (!preset) return;
    set({ params: { ...preset.params }, presetId: id });
    writeSaved(preset.params, get().muted);
  },
  randomize: () => {
    const params = randomParams();
    set({ params, presetId: null });
    writeSaved(params, get().muted);
  },
  reshuffle: () => {
    const params = {
      ...get().params,
      seed: Math.floor(Math.random() * 9999),
    };
    set({ params, presetId: null });
    writeSaved(params, get().muted);
  },
  reset: () => {
    const params = { ...DEFAULT_PARAMS };
    set({ params, presetId: "golden" });
    writeSaved(params, get().muted);
  },
  toggleMute: () => {
    const muted = !get().muted;
    set({ muted });
    writeSaved(get().params, muted);
  },
  setMuted: (muted) => {
    set({ muted });
    writeSaved(get().params, muted);
  },
  enter: () => set({ entered: true }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  hydrate: () => {
    const saved = readSaved();
    if (!saved) return;
    const { muted, ...rest } = saved as Partial<Params> & { muted?: boolean };
    set({
      params: { ...DEFAULT_PARAMS, ...rest },
      muted: Boolean(muted),
      presetId: null,
    });
  },
}));
