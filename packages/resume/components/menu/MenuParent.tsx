import { type ReactNode, useReducer } from "react";

import { closedMenuBar, openMenu, transition } from "../../lib/menuBar";
import { MenuParentProvider } from "./MenuParentContext";

interface MenuProps {
  children: ReactNode;
}

export default function MenuParent({ children }: MenuProps) {
  const [state, dispatch] = useReducer(transition, closedMenuBar);
  return (
    <MenuParentProvider openMenu={openMenu(state)} dispatch={dispatch}>
      {children}
    </MenuParentProvider>
  );
}
