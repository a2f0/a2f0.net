import { LayoutIcon } from "@phosphor-icons/react/dist/csr/Layout";
import {
  NavigationModeSwitch,
  SystemTray,
  type SystemTrayDefinition,
  type SystemTrayMenuItem,
  ThemeSwitch,
  useLauncherNavigationActions,
  useLauncherNavigationState,
} from "@tearleads/windowing";
import { ThemeInvertIcon } from "@tearleads/windowing/theme";
import { useMemo } from "react";

import { MINI_APP_ICON_LABELS, MINI_APP_ICONS } from "../mini-apps/catalog";

// Where the taskbar keeps the tray apps the visitor turned off.
export const SYSTEM_TRAY_STORAGE_KEY = "website.systemTray";

// The switch to the layout not showing: the routed shell from the desktop, the
// desktop from the routed shell.
function LayoutSwitch() {
  const { mode } = useLauncherNavigationState();
  return <NavigationModeSwitch mode={mode} />;
}

/**
 * The taskbar corner's tray apps, in both layouts: the layout switch, then the
 * theme switch. Each one's context menu turns it off; Display Properties turns
 * it back on.
 */
export const WEBSITE_SYSTEM_TRAY: SystemTrayDefinition<"layout" | "theme"> = {
  apps: {
    layout: {
      component: LayoutSwitch,
      icon: LayoutIcon,
      title: "Layout Switch",
    },
    theme: {
      component: ThemeSwitch,
      icon: ThemeInvertIcon,
      title: "Theme Switch",
    },
  },
  order: ["layout", "theme"],
};

/** The tray, whose apps' context menus also open Display Properties. */
export function WebsiteSystemTray() {
  const { openMiniApp } = useLauncherNavigationActions();
  const menuItems = useMemo(
    (): SystemTrayMenuItem[] => [
      {
        icon: MINI_APP_ICONS["display-properties"],
        id: "display-properties",
        label: MINI_APP_ICON_LABELS["display-properties"],
        onSelect: () => openMiniApp({ appId: "display-properties" }),
      },
    ],
    [openMiniApp],
  );
  return <SystemTray menuItems={menuItems} />;
}
