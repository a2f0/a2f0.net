import { type ReactNode, createContext, useContext } from "react";

const DropdownMenuContext = createContext<DropdownContextProps | undefined>(
  undefined,
);

interface DropdownContextProps {
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
}

interface DropdownMenuProps {
  children: ReactNode;
  setIsActive: React.Dispatch<React.SetStateAction<boolean>>;
}

function DropdownMenuProvider({ children, setIsActive }: DropdownMenuProps) {
  return (
    <DropdownMenuContext.Provider value={{ setIsActive: setIsActive }}>
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
