import { Button } from "@/components/ui/button";
import { useCascade } from "@/lib/waterfall/store";

export function IntroGate() {
  const entered = useCascade((s) => s.entered);
  const enter = useCascade((s) => s.enter);
  const setMuted = useCascade((s) => s.setMuted);

  if (entered) return null;

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-bg/35 p-5 md:justify-start md:pl-[8%]">
      <div className="w-full max-w-md rounded-3xl border border-border bg-bg/80 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted">
          Living landscape
        </p>
        <h1 className="mt-3 font-display text-4xl leading-[1.1] tracking-tight text-fg text-balance">
          Cascade
        </h1>
        <p className="mt-3 max-w-sm text-base leading-relaxed text-muted text-pretty">
          Tune the gorge. Flow, wind, season, and hour of day. The fall answers.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button
            className="h-12 rounded-xl px-6"
            onClick={() => {
              setMuted(false);
              enter();
            }}
          >
            Enter the gorge
          </Button>
          <Button
            variant="secondary"
            className="h-12 rounded-xl px-6"
            onClick={() => {
              setMuted(true);
              enter();
            }}
          >
            Watch in silence
          </Button>
        </div>
      </div>
    </div>
  );
}
