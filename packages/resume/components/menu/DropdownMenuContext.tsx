import { createContext, type ReactNode, useContext } from "react";

const DropdownMenuContext = createContext<DropdownContextProps | undefined>(
  undefined,
);

interface DropdownContextProps {
  /** Hides the menu, returning focus to its button if focus was inside. */
  close: () => void;
}

interface DropdownMenuProps {
  children: ReactNode;
  close: () => void;
}

function DropdownMenuProvider({ children, close }: DropdownMenuProps) {
  return (
    <DropdownMenuContext.Provider value={{ close }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

function useDropdownMenu() {
  const context = useContext(DropdownMenuContext);
  if (context === undefined) {
    throw new Error(
      "useDropdownMenu must be used within a DropdownMenuProvider",
    );
  }
  return context;
}

export { DropdownMenuProvider, useDropdownMenu };
