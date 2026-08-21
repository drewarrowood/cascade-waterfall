import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { DesktopPanel, MobileChrome } from "@/components/control-panel";
import { IntroGate } from "@/components/intro-gate";
import { WaterfallCanvas } from "@/components/waterfall-canvas";
import { useCascade } from "@/lib/waterfall/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrate = useCascade((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <main className="relative flex h-dvh min-h-0 overflow-hidden bg-bg text-fg">
      <div className="relative min-w-0 flex-1">
        <WaterfallCanvas />
        <IntroGate />
        <MobileChrome />
      </div>
      <DesktopPanel />
    </main>
  );
}
