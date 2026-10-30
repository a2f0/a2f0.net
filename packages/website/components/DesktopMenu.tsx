import { Menu, MenuItem, type MenuPosition } from "@tearleads/windowing";
import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from "react";

import { MINI_APP_ICONS, MINI_APP_TITLES } from "../mini-apps/catalog";
import { useOpenMiniApp } from "../mini-apps/useOpenMiniApp";

/**
 * The desktop surface, with a context menu on its bare background (the
 * wallpaper and the icon layer let presses through to it) that opens Display
 * Properties. Right-clicks on icons and windows keep their own menus. The
 * listener is a native one: the surface is a plain container, not a control,
 * and the menu is a pointer shortcut to an app the start menu also opens.
 */
export function DesktopSurfaceWithMenu({ children }: PropsWithChildren) {
  const openMiniApp = useOpenMiniApp();
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
            label={MINI_APP_TITLES["display-properties"]}
            onClick={() => {
              closeMenu();
              openMiniApp("display-properties");
            }}
          />
        </Menu>
      )}
    </div>
  );
}
