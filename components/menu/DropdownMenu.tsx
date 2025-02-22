import React, {type ReactNode, useEffect, useRef} from 'react';

import {useAppSelector} from '../../lib/hooks';
import {selectScale} from '../../lib/resumeConfigSlice';
import {useDetectOutsideClick} from '../../lib/useDetectOutsideClick';
import {DropdownMenuProvider} from './DropdownMenuContext';
import {MenuButton} from './MenuButton';
import {MenuContainer} from './MenuContainer';
import {MenuItems} from './MenuItems';
import {useMenuParent} from './MenuParentContext';

interface MenuProps {
  children: ReactNode;
  label: string;
}

export default function DropdownMenu({children, label}: MenuProps) {
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isActive, setIsActive] = useDetectOutsideClick(dropdownRef, false);
  const parentContext = useMenuParent();
  const scale = useAppSelector(selectScale);
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

  useEffect(() => {
    if (parentContext.activeDropdown !== label) {
      setIsActive(false);
    }
  }, [parentContext.activeDropdown, label, setIsActive]);

  return (
    <DropdownMenuProvider setIsActive={setIsActive}>
      <MenuContainer ref={dropdownRef}>
        <MenuButton
          scale={scale}
          id={`menuButton${label}`}
          onClick={onClick}
          onMouseEnter={onMouseEnter}
        >
          {label}
        </MenuButton>
        <MenuItems id={`menuItems${label}`} $isActive={isActive} scale={scale}>
          {children}
        </MenuItems>
      </MenuContainer>
    </DropdownMenuProvider>
  );
}
