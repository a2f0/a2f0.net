import { type ReactNode, useState } from "react";

import { MenuParentProvider } from "./MenuParentContext";

interface MenuProps {
  children: ReactNode;
}

export default function MenuParent({ children }: MenuProps) {
  const [isActive, setIsActive] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState("");
  return (
    <MenuParentProvider
      activeDropdown={activeDropdown}
      setActiveDropdown={setActiveDropdown}
      isActive={isActive}
      setIsActive={setIsActive}
    >
      {children}
    </MenuParentProvider>
  );
}
