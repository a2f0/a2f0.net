import { useWindowStateData, WindowStateProvider } from "@tearleads/windowing";

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

export default function Desktop() {
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
