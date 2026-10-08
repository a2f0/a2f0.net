import {
  findTopWindow,
  StartMenu,
  type StartMenuItem,
  useWindowActions,
  useWindowStateData,
} from "@tearleads/windowing";
import { useEffect, useMemo, useRef } from "react";

import {
  MINI_APP_ICONS,
  MINI_APP_LAUNCH_ORDER,
  MINI_APP_TITLES,
} from "../mini-apps/catalog";
import { isMiniAppId } from "../mini-apps/types";
import { useOpenMiniApp } from "../mini-apps/useOpenMiniApp";
import StartIcon from "./StartIcon";

const START_ICON = <StartIcon className="desktop-start-icon" />;

/**
 * The start menu, which opens any mini-app, then a button per open window, as
 * in Tearleads' footer. A button restores its window and brings it to the
 * front. The front window's button is pressed, and a minimized window's shows
 * its title muted. Closing a window removes its button; the start menu opens
 * the app again.
 */
export default function Taskbar() {
  const { windows } = useWindowStateData();
  const { restore } = useWindowActions();
  const openMiniApp = useOpenMiniApp();
  const front = findTopWindow(windows, (entry) => !entry.minimized);

  // Open every app once on load; reopening after a close is the start menu's
  // job.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    for (const appId of MINI_APP_LAUNCH_ORDER) openMiniApp(appId);
  });

  const startItems = useMemo(
    () =>
      MINI_APP_LAUNCH_ORDER.map(
        (appId): StartMenuItem => ({
          icon: MINI_APP_ICONS[appId],
          id: appId,
          label: MINI_APP_TITLES[appId],
          onSelect: () => openMiniApp(appId),
        }),
      ),
    [openMiniApp],
  );

  return (
    <nav className="desktop-taskbar" aria-label="Windows">
      <StartMenu icon={START_ICON} items={startItems} />
      {windows.map((entry) => {
        const AppIcon = isMiniAppId(entry.appId)
          ? MINI_APP_ICONS[entry.appId]
          : undefined;
        return (
          <button
            key={entry.id}
            type="button"
            className="desktop-taskbar-button"
            aria-pressed={entry.id === front?.id}
            data-state={entry.minimized ? "minimized" : "open"}
            title={entry.title}
            onClick={() => restore(entry.id)}
          >
            {AppIcon && (
              <AppIcon aria-hidden className="desktop-taskbar-icon" size={16} />
            )}
            <span className="desktop-taskbar-label">{entry.title}</span>
          </button>
        );
      })}
    </nav>
  );
}
