import { useEffect, useRef } from "react";
import { CascadeEngine } from "@/lib/waterfall/engine";
import { useCascade } from "@/lib/waterfall/store";
import { snapshotScene } from "@/lib/studio/snapshot";

export function WaterfallCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CascadeEngine | null>(null);
  const params = useCascade((s) => s.params);
  const muted = useCascade((s) => s.muted);
  const entered = useCascade((s) => s.entered);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new CascadeEngine(canvas, useCascade.getState().params);
    engineRef.current = engine;
    engine.resize();
    engine.start();
    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    engineRef.current?.setParams(params);
  }, [params]);

  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    if (entered) engine.audio.unlock();
    engine.audio.apply(params, muted);
  }, [params, muted, entered]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const store = useCascade.getState();
      if (e.key === "m" || e.key === "M") store.toggleMute();
      if (e.key === "r" || e.key === "R") store.randomize();
      if (e.key === "g" || e.key === "G") store.reshuffle();
      if (e.key === "s" || e.key === "S") void openSnapshotStudio();
      if (e.key === "[" || e.key === "]") {
        const next = store.params.timeOfDay + (e.key === "]" ? 0.5 : -0.5);
        store.setParam("timeOfDay", (next + 24) % 24);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full touch-none"
      data-cascade-scene
      aria-label="Living waterfall scene"
    />
  );
}

export async function openSnapshotStudio() {
  const scene = await snapshotScene();
  if (!scene) return;
  useCascade.getState().openStudio(scene);
}
