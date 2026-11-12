import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import {
  findTopWindow,
  NavigationModeSwitch,
  StartMenu,
  type StartMenuItem,
  ThemeSwitch,
  useLauncherNavigationActions,
  useScreensaver,
  useWindowActions,
  useWindowStateData,
} from "@tearleads/windowing";
import { useMemo } from "react";

import {
  MINI_APP_ICON_LABELS,
  MINI_APP_ICONS,
  MINI_APP_ORDER,
} from "../mini-apps/catalog";
import { isMiniAppId } from "../mini-apps/types";
import StartIcon from "./StartIcon";

const START_ICON = <StartIcon className="desktop-start-icon" />;

/**
 * The start menu, which opens any mini-app and Display Properties, then a
 * button per open window, as
 * in Tearleads' footer. A button restores its window and brings it to the
 * front. The front window's button is pressed, and a minimized window's shows
 * its title muted. Closing a window removes its button; the start menu opens
 * the app again. The corner holds the switch to the routed (iPad / phone)
 * layout and, last, the theme switch.
 */
export default function Taskbar() {
  const { windows } = useWindowStateData();
  const { restore } = useWindowActions();
  const { openMiniApp } = useLauncherNavigationActions();
  const { start } = useScreensaver();
  const front = findTopWindow(windows, (entry) => !entry.minimized);

  // Desktop context-menu actions also belong here for keyboard access.
  const startItems = useMemo(
    (): StartMenuItem[] => [
      ...MINI_APP_ORDER.map(
        (appId): StartMenuItem => ({
          icon: MINI_APP_ICONS[appId],
          id: appId,
          label: MINI_APP_ICON_LABELS[appId],
          onSelect: () => openMiniApp({ appId }),
        }),
      ),
      {
        icon: SparkleIcon,
        id: "screensaver",
        label: "Start Screensaver",
        onSelect: start,
      },
    ],
    [openMiniApp, start],
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
      <div className="desktop-taskbar-end">
        <NavigationModeSwitch mode="windowed" />
        <ThemeSwitch />
      </div>
    </nav>
  );
}
