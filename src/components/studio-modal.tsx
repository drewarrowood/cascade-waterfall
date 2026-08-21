import { useEffect, useState } from "react";
import { Camera, Download, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { paintSnapshot, studioStatus, type PaintStyle } from "@/lib/studio/paint";
import { downloadDataUri } from "@/lib/studio/snapshot";
import { useCascade } from "@/lib/waterfall/store";

const STYLE_META: { id: PaintStyle; name: string }[] = [
  { id: "van-gogh", name: "Van Gogh" },
  { id: "klimt", name: "Klimt" },
];

export function StudioModal() {
  const scene = useCascade((s) => s.studioScene);
  const closeStudio = useCascade((s) => s.closeStudio);
  const [painting, setPainting] = useState<string | null>(null);
  const [busy, setBusy] = useState<PaintStyle | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [view, setView] = useState<"scene" | "painting">("scene");

  useEffect(() => {
    setPainting(null);
    setBusy(null);
    setError(null);
    setView("scene");
    if (!scene) return;
    let cancelled = false;
    void studioStatus().then((s) => {
      if (!cancelled) setAvailable(s.available);
    });
    return () => {
      cancelled = true;
    };
  }, [scene]);

  if (!scene) return null;

  const shown = view === "painting" && painting ? painting : scene;

  async function paint(style: PaintStyle) {
    if (busy) return;
    setBusy(style);
    setError(null);
    try {
      const result = await paintSnapshot({ data: { image: scene!, style } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPainting(result.image);
      setView("painting");
    } catch {
      setError("The studio could not reach the canvas.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-bg/55 p-3 md:items-center md:p-6">
      <div
        role="dialog"
        aria-labelledby="studio-title"
        className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-border bg-bg p-4 shadow-[0_24px_80px_rgba(0,0,0,0.4)] md:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p
              id="studio-title"
              className="font-display text-2xl leading-tight tracking-tight text-fg"
            >
              Studio
            </p>
            <p className="mt-1 text-sm text-muted text-pretty">
              Keep the still, or have it painted.
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close studio"
            onClick={closeStudio}
          >
            <X />
          </Button>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-surface-2">
          <img
            src={shown}
            alt={view === "painting" ? "Painted waterfall" : "Waterfall snapshot"}
            className="mx-auto max-h-[min(52dvh,28rem)] w-full object-contain"
          />
          {busy ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-bg/55">
              <Loader2 className="size-6 animate-spin text-accent" />
              <p className="studio-shimmer text-sm font-medium text-muted">
                Painting in oils
              </p>
            </div>
          ) : null}
        </div>

        {painting ? (
          <div className="mt-3 flex gap-1.5">
            <button
              type="button"
              onClick={() => setView("scene")}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition-colors duration-150",
                view === "scene"
                  ? "bg-fg text-bg"
                  : "bg-fg/8 text-muted hover:bg-fg/12 hover:text-fg",
              )}
            >
              Scene
            </button>
            <button
              type="button"
              onClick={() => setView("painting")}
              className={cn(
                "h-8 rounded-full px-3 text-xs font-medium transition-colors duration-150",
                view === "painting"
                  ? "bg-fg text-bg"
                  : "bg-fg/8 text-muted hover:bg-fg/12 hover:text-fg",
              )}
            >
              Painting
            </button>
          </div>
        ) : null}

        {available === false ? (
          <p className="mt-3 text-sm text-muted">
            Painting is unavailable in this environment. You can still save the still.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {STYLE_META.map((s) => (
              <Button
                key={s.id}
                variant="secondary"
                className="h-12 rounded-xl"
                disabled={Boolean(busy) || available === null}
                onClick={() => void paint(s.id)}
              >
                {busy === s.id ? "Painting" : s.name}
              </Button>
            ))}
          </div>
        )}

        {error ? (
          <p className="mt-3 text-sm text-muted" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              downloadDataUri(scene, `cascade-${Date.now()}.jpg`)
            }
          >
            <Camera />
            Save still
          </Button>
          {painting ? (
            <Button
              size="sm"
              onClick={() =>
                downloadDataUri(painting, `cascade-painting-${Date.now()}.jpg`)
              }
            >
              <Download />
              Save painting
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
