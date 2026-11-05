import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
} from "react";

import type { MenuBarEvent } from "../../lib/menuBar";

interface ParentContextProps {
  /** The label of the open menu, or null when the bar is closed. */
  openMenu: string | null;
  dispatch: Dispatch<MenuBarEvent>;
}

const MenuParentContext = createContext<ParentContextProps | undefined>(
  undefined,
);

interface MenuParentProps extends ParentContextProps {
  children: ReactNode;
}

function MenuParentProvider({ children, openMenu, dispatch }: MenuParentProps) {
  return (
    <MenuParentContext.Provider value={{ openMenu, dispatch }}>
      {children}
    </MenuParentContext.Provider>
  );
}

function useMenuParent() {
  const context = useContext(MenuParentContext);
  if (context === undefined) {
    throw new Error("useMenuParent must be used within a MenuParentProvider");
  }
  return context;
}

export { MenuParentProvider, useMenuParent };
