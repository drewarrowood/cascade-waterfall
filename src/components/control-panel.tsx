import type { ReactNode } from "react";
import {
  Camera,
  Droplets,
  Mountain,
  Shuffle,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import {
  clockPhrase,
  sampleSeason,
  timeLabel,
  weatherLabel,
} from "@/lib/waterfall/palette";
import { PRESETS } from "@/lib/waterfall/presets";
import { useCascade } from "@/lib/waterfall/store";
import type { Params } from "@/lib/waterfall/types";
import { captureFalls } from "@/components/waterfall-canvas";

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <Label>{label}</Label>
        <span className="font-mono text-xs tabular-nums text-subtle">
          {value}
        </span>
      </div>
      {children}
    </div>
  );
}

function num(v: number[], fallback: number) {
  return v[0] ?? fallback;
}

function Controls() {
  const params = useCascade((s) => s.params);
  const setParam = useCascade((s) => s.setParam);
  const season = sampleSeason(params.season);

  const bind = (key: keyof Params, min: number, max: number, step = 0.01) => ({
    min,
    max,
    step,
    value: [params[key] as number],
    onValueChange: (v: number[]) => setParam(key, num(v, params[key] as number)),
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-fg">
          <Droplets className="size-3.5 text-muted" />
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Water
          </h2>
        </div>
        <Row label="Flow" value={`${Math.round(params.flow * 100)}`}>
          <Slider {...bind("flow", 0.05, 1)} />
        </Row>
        <Row label="Width" value={`${Math.round(params.width * 100)}`}>
          <Slider {...bind("width", 0.08, 1)} />
        </Row>
        <Row label="Drop" value={`${Math.round(params.drop * 100)}`}>
          <Slider {...bind("drop", 0.15, 1)} />
        </Row>
        <Row
          label="Wind"
          value={`${params.wind >= 0 ? "+" : ""}${params.wind.toFixed(2)}`}
        >
          <Slider {...bind("wind", -1, 1)} />
        </Row>
        <Row label="Turbulence" value={`${Math.round(params.turbulence * 100)}`}>
          <Slider {...bind("turbulence", 0, 1)} />
        </Row>
        <Row label="Mist" value={`${Math.round(params.mist * 100)}`}>
          <Slider {...bind("mist", 0, 1)} />
        </Row>
        <Row label="Foam" value={`${Math.round(params.foam * 100)}`}>
          <Slider {...bind("foam", 0, 1)} />
        </Row>
        <Row label="Rainbow" value={`${Math.round(params.rainbow * 100)}`}>
          <Slider {...bind("rainbow", 0, 1)} />
        </Row>
      </section>

      <Separator />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Mountain className="size-3.5 text-muted" />
          <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Land
          </h2>
        </div>
        <Row
          label="Time"
          value={`${timeLabel(params.timeOfDay)} · ${clockPhrase(params)}`}
        >
          <Slider {...bind("timeOfDay", 0, 24, 0.05)} />
        </Row>
        <Row label="Season" value={season.name}>
          <Slider {...bind("season", 0, 0.999, 0.01)} />
        </Row>
        <Row label="Weather" value={weatherLabel(params.weather)}>
          <Slider {...bind("weather", 0, 1)} />
        </Row>
        <Row label="Greenery" value={`${Math.round(params.vegetation * 100)}`}>
          <Slider {...bind("vegetation", 0, 1)} />
        </Row>
        <Row
          label="Stone"
          value={params.rockWarmth < 0.5 ? "Basalt" : "Sandstone"}
        >
          <Slider {...bind("rockWarmth", 0, 1)} />
        </Row>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Atmosphere
        </h2>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="live-sky" className="text-sm text-fg">
            Living sky
          </Label>
          <Switch
            id="live-sky"
            checked={params.liveSky}
            onCheckedChange={(v) => setParam("liveSky", v)}
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="wildlife" className="text-sm text-fg">
            Wildlife
          </Label>
          <Switch
            id="wildlife"
            checked={params.wildlife}
            onCheckedChange={(v) => setParam("wildlife", v)}
          />
        </div>
      </section>
    </div>
  );
}

function PresetRow() {
  const presetId = useCascade((s) => s.presetId);
  const applyPreset = useCascade((s) => s.applyPreset);
  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => applyPreset(p.id)}
          className={cn(
            "h-8 rounded-full px-3 text-xs font-medium transition-colors duration-150",
            presetId === p.id
              ? "bg-fg text-bg"
              : "bg-fg/8 text-muted hover:bg-fg/12 hover:text-fg",
          )}
        >
          {p.name}
        </button>
      ))}
    </div>
  );
}

function Actions() {
  const muted = useCascade((s) => s.muted);
  const toggleMute = useCascade((s) => s.toggleMute);
  const randomize = useCascade((s) => s.randomize);
  const reshuffle = useCascade((s) => s.reshuffle);
  const reset = useCascade((s) => s.reset);
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={toggleMute}
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX /> : <Volume2 />}
        {muted ? "Muted" : "Sound"}
      </Button>
      <Button variant="secondary" size="sm" onClick={randomize}>
        <Shuffle />
        Random
      </Button>
      <Button variant="ghost" size="sm" onClick={reshuffle}>
        New gorge
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void captureFalls()}>
        <Camera />
        Save
      </Button>
      <Button variant="ghost" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  );
}

export function DesktopPanel() {
  return (
    <aside className="pointer-events-auto hidden h-full w-[min(22rem,34vw)] shrink-0 flex-col border-l border-border bg-bg/88 md:flex">
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div>
          <p className="font-display text-2xl leading-tight tracking-tight text-fg">
            Cascade
          </p>
          <p className="mt-1 text-sm text-muted text-pretty">
            Compose a living waterfall.
          </p>
        </div>
      </div>
      <div className="px-5 pb-3">
        <PresetRow />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <Controls />
      </div>
      <div className="border-t border-border px-5 py-3">
        <Actions />
      </div>
    </aside>
  );
}

export function MobileChrome() {
  const open = useCascade((s) => s.panelOpen);
  const setOpen = useCascade((s) => s.setPanelOpen);
  const muted = useCascade((s) => s.muted);
  const toggleMute = useCascade((s) => s.toggleMute);
  const randomize = useCascade((s) => s.randomize);

  return (
    <div className="pointer-events-none absolute inset-0 md:hidden">
      <div className="pointer-events-auto absolute top-4 left-4 right-4 flex items-start justify-between">
        <div>
          <p className="font-display text-xl tracking-tight text-fg drop-shadow-sm">
            Cascade
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
          <Button
            variant="secondary"
            size="icon-sm"
            aria-label="Randomize"
            onClick={randomize}
          >
            <Shuffle />
          </Button>
        </div>
      </div>

      <div className="pointer-events-auto absolute inset-x-4 bottom-4">
        <Button
          className="h-12 w-full rounded-2xl"
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal />
          Compose
        </Button>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="pointer-events-auto absolute inset-0 bg-bg/40"
            aria-label="Close controls"
            onClick={() => setOpen(false)}
          />
          <div className="pointer-events-auto absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto rounded-t-3xl border-t border-border bg-bg px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-fg/20" />
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-lg text-fg">Compose</p>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Close"
                onClick={() => setOpen(false)}
              >
                <X />
              </Button>
            </div>
            <PresetRow />
            <div className="mt-4">
              <Controls />
            </div>
            <div className="mt-5">
              <Actions />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
