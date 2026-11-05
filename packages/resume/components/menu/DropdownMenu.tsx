import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import { useAppSelector } from "../../lib/hooks";
import { selectScale } from "../../lib/resumeConfigSlice";
import { DropdownMenuProvider } from "./DropdownMenuContext";
import { MenuButton } from "./MenuButton";
import { MenuContainer } from "./MenuContainer";
import { MenuItems } from "./MenuItems";
import { useMenuParent } from "./MenuParentContext";

interface MenuProps {
  children: ReactNode;
  label: string;
}

export default function DropdownMenu({ children, label }: MenuProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { openMenu, dispatch } = useMenuParent();
  const isActive = openMenu === label;
  const scale = useAppSelector(selectScale);
  const menuId = `menuItems${label}`;
  const onClick = () => dispatch({ type: "toggle", menu: label });

  const onMouseEnter = () => dispatch({ type: "hover", menu: label });

  const dismiss = () => dispatch({ type: "dismiss", menu: label });

  // Hiding the menu would otherwise drop focus to the page.
  const close = () => {
    const hadFocus =
      dropdownRef.current?.contains(document.activeElement) ?? false;
    dismiss();
    if (hadFocus) buttonRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape" && isActive) {
      event.preventDefault();
      close();
    }
  };

  // Tabbing out of an open menu closes it.
  const onBlur = (event: FocusEvent) => {
    if (isActive && !dropdownRef.current?.contains(event.relatedTarget)) {
      dismiss();
    }
  };

  // A click outside the open menu closes it. The dismissal names this menu,
  // so the click that opened another menu leaves that one open.
  useEffect(() => {
    if (!isActive) return;
    const onWindowClick = (event: MouseEvent) => {
      if (
        dropdownRef.current !== null &&
        !dropdownRef.current.contains(event.target as Node)
      )
        dispatch({ type: "dismiss", menu: label });
    };
    window.addEventListener("click", onWindowClick);
    return () => window.removeEventListener("click", onWindowClick);
  }, [isActive, dispatch, label]);

  return (
    <DropdownMenuProvider close={close}>
      <MenuContainer ref={dropdownRef} onKeyDown={onKeyDown} onBlur={onBlur}>
        <MenuButton
          ref={buttonRef}
          type="button"
          scale={scale}
          id={`menuButton${label}`}
          aria-expanded={isActive}
          aria-controls={menuId}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
        >
          {label}
        </MenuButton>
        <MenuItems id={menuId} $isActive={isActive} scale={scale}>
          {children}
        </MenuItems>
      </MenuContainer>
    </DropdownMenuProvider>
  );
}
