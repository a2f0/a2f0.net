import { useWindowStateData, WindowStateProvider } from "@tearleads/windowing";
import { useEffect } from "react";

import { MiniAppWindow } from "../mini-apps/MiniAppWindow";
import Taskbar from "./Taskbar";

function DesktopSurface() {
  const { windows } = useWindowStateData();
  return (
    <div className="desktop-surface">
      {windows.map((entry) => (
        <MiniAppWindow key={entry.id} windowId={entry.id} />
      ))}
    </div>
  );
}

/**
 * Clears `data-pristine` on the first key or pointer press. Browsers count the
 * focus the window layer gives the front window on load as keyboard focus, so
 * global.css hides the window focus ring until then. @tearleads/windowing
 * stops this itself after 0.2.1; delete this, the attribute, and its rule
 * once the experiment depends on that release.
 */
function useFirstInput() {
  useEffect(() => {
    const controller = new AbortController();
    const touched = () => {
      delete document.documentElement.dataset.pristine;
      controller.abort();
    };
    for (const type of ["keydown", "pointerdown"]) {
      window.addEventListener(type, touched, {
        capture: true,
        signal: controller.signal,
      });
    }
    return () => controller.abort();
  }, []);
}

export default function Desktop() {
  useFirstInput();
  return (
    <WindowStateProvider>
      <main className="desktop">
        <h1 className="visually-hidden">a2f0 experiment</h1>
        <DesktopSurface />
        <Taskbar />
      </main>
    </WindowStateProvider>
  );
}
