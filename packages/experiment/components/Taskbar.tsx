import { useWindowStateData } from "@tearleads/windowing";
import { useEffect, useRef } from "react";

import { MINI_APP_LAUNCH_ORDER, MINI_APP_TITLES } from "../mini-apps/catalog";
import { useOpenMiniApp } from "../mini-apps/useOpenMiniApp";

/** A button per mini-app, pressed while its window is open and showing. */
export default function Taskbar() {
  const { windows } = useWindowStateData();
  const openMiniApp = useOpenMiniApp();

  // Open every app once on load; reopening after a close is the taskbar's job.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    for (const appId of MINI_APP_LAUNCH_ORDER) openMiniApp(appId);
  });

  return (
    <nav className="desktop-taskbar" aria-label="Windows">
      {MINI_APP_LAUNCH_ORDER.map((appId) => {
        const open = windows.find((entry) => entry.appId === appId);
        return (
          <button
            key={appId}
            type="button"
            className="desktop-taskbar-button"
            aria-pressed={open !== undefined && !open.minimized}
            onClick={() => openMiniApp(appId)}
          >
            {MINI_APP_TITLES[appId]}
          </button>
        );
      })}
    </nav>
  );
}
