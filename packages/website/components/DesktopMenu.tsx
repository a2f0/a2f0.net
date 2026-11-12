import { SparkleIcon } from "@phosphor-icons/react/dist/csr/Sparkle";
import {
  Menu,
  MenuItem,
  type MenuPosition,
  useLauncherNavigationActions,
  useScreensaver,
} from "@tearleads/windowing";
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";

import { MINI_APP_ICON_LABELS, MINI_APP_ICONS } from "../mini-apps/catalog";

/**
 * The desktop surface, with a context menu on its bare background (the
 * wallpaper and the icon layer let presses through to it) that opens Display
 * Properties or starts the screensaver. Icons and windows keep their own menus.
 * The listener is native: the surface is a plain container, not a control,
 * and every action is also keyboard-reachable through the Start menu.
 */
export function DesktopSurfaceWithMenu({ children }: PropsWithChildren) {
  const { openMiniApp } = useLauncherNavigationActions();
  const { start } = useScreensaver();
  const [surface, setSurface] = useState<HTMLDivElement | null>(null);
  const [menu, setMenu] = useState<MenuPosition | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  useEffect(() => {
    if (!surface) return;
    const onContextMenu = (event: MouseEvent) => {
      if (event.target !== surface) return;
      event.preventDefault();
      setMenu({ x: event.clientX, y: event.clientY });
    };
    surface.addEventListener("contextmenu", onContextMenu);
    return () => surface.removeEventListener("contextmenu", onContextMenu);
  }, [surface]);

  return (
    <div className="desktop-surface" ref={setSurface}>
      {children}
      {menu && (
        <Menu direction="down" onClose={closeMenu} position={menu}>
          <MenuItem
            icon={MINI_APP_ICONS["display-properties"]}
            label={MINI_APP_ICON_LABELS["display-properties"]}
            onClick={() => {
              closeMenu();
              openMiniApp({ appId: "display-properties" });
            }}
          />
          <MenuItem
            icon={SparkleIcon}
            label="Start Screensaver"
            onClick={() => {
              closeMenu();
              start();
            }}
          />
        </Menu>
      )}
    </div>
  );
}
