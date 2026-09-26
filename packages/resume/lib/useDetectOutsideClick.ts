import type React from "react";
import { type SetStateAction, useEffect, useState } from "react";

import { useMenuParent } from "../components/menu/MenuParentContext";
export const useDetectOutsideClick = (
  el: React.MutableRefObject<HTMLDivElement | null>,
  initialState: boolean,
): [boolean, React.Dispatch<SetStateAction<boolean>>] => {
  const [isActive, setIsActive] = useState(initialState);
  const parentContext = useMenuParent();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // If the active element exists and is clicked outside of
      if (el.current !== null && !el.current.contains(e.target as Node)) {
        setIsActive(false);
        parentContext.setActiveDropdown("");
        parentContext.setIsActive(false);
      }
    };

    // If the item is active (ie open) then listen for clicks outside
    if (isActive) {
      window.addEventListener("click", onClick);
    }

    return () => {
      window.removeEventListener("click", onClick);
    };
  }, [
    isActive,
    el,
    parentContext.setIsActive,
    parentContext.setActiveDropdown,
  ]);

  return [isActive, setIsActive];
};
