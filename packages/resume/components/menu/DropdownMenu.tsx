import {
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

import { useAppSelector } from "../../lib/hooks";
import { selectScale } from "../../lib/resumeConfigSlice";
import { useDetectOutsideClick } from "../../lib/useDetectOutsideClick";
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
  const [isActive, setIsActive] = useDetectOutsideClick(dropdownRef, false);
  const parentContext = useMenuParent();
  const scale = useAppSelector(selectScale);
  const menuId = `menuItems${label}`;
  const onClick = () => {
    const newIsActive = !isActive;
    setIsActive(newIsActive);
    parentContext.setIsActive(newIsActive);
    parentContext.setActiveDropdown(label);
  };

  const onMouseEnter = () => {
    if (parentContext.isActive === true) {
      setIsActive(true);
      parentContext.setActiveDropdown(label);
    }
  };

  const dismiss = () => {
    setIsActive(false);
    parentContext.setActiveDropdown("");
    parentContext.setIsActive(false);
  };

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

  useEffect(() => {
    if (parentContext.activeDropdown !== label) {
      setIsActive(false);
    }
  }, [parentContext.activeDropdown, label, setIsActive]);

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
