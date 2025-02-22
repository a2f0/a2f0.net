import React, {type ReactNode} from 'react';

const MenuParentContext = React.createContext<ParentContextProps | undefined>(
  undefined
);

interface ParentContextProps {
  activeDropdown: string;
  setActiveDropdown: React.Dispatch<React.SetStateAction<string>>;
  isActive: boolean;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
}

interface MenuParentProps {
  children: ReactNode;
  activeDropdown: string;
  setActiveDropdown: React.Dispatch<React.SetStateAction<string>>;
  isActive: boolean;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
}

function MenuParentProvider({
  children,
  activeDropdown,
  setActiveDropdown,
  isActive,
  setIsActive,
}: MenuParentProps) {
  return (
    <MenuParentContext.Provider
      value={{
        activeDropdown: activeDropdown,
        setActiveDropdown: setActiveDropdown,
        isActive: isActive,
        setIsActive: setIsActive,
      }}
    >
      {children}
    </MenuParentContext.Provider>
  );
}

function useMenuParent() {
  const context = React.useContext(MenuParentContext);
  if (context === undefined) {
    throw new Error('useMenuParent must be used within a MenuParentProvider');
  }
  return context;
}

export {MenuParentProvider, useMenuParent};
