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
 * Clears `data-pristine` on the first key press. Browsers count the focus the
 * window layer gives the front window on load as keyboard focus, so global.css
 * hides the window focus ring until then. A pointer press does not clear it:
 * clicking the window that already has focus leaves that focus, and its
 * load-time ring, in place. @tearleads/windowing stops this itself after
 * 0.2.1; delete this, the attribute, and its rule once the experiment depends
 * on that release.
 */
function useFirstKeyPress() {
  useEffect(() => {
    const controller = new AbortController();
    window.addEventListener(
      "keydown",
      () => {
        delete document.documentElement.dataset.pristine;
        controller.abort();
      },
      { capture: true, signal: controller.signal },
    );
    return () => controller.abort();
  }, []);
}

export default function Desktop() {
  useFirstKeyPress();
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
