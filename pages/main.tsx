import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { DesktopPanel, MobileChrome } from "@/components/control-panel";
import { IntroGate } from "@/components/intro-gate";
import { StudioModal } from "@/components/studio-modal";
import { WaterfallCanvas } from "@/components/waterfall-canvas";
import { useCascade } from "@/lib/waterfall/store";
import "../src/styles.css";

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
      <StudioModal />
    </main>
  );
}

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <Home />
  </StrictMode>,
);
