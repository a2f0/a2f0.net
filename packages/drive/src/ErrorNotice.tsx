import { XIcon } from "@phosphor-icons/react";
import { createContext, useContext } from "react";

export const DriveErrorContext = createContext<{
  message: string | null;
  dismiss(): void;
}>({ message: null, dismiss: () => undefined });

export function ErrorNotice() {
  const { message, dismiss } = useContext(DriveErrorContext);
  if (!message) return null;
  return (
    <div className="drive-error" role="alert">
      <span>{message}</span>
      <button type="button" onClick={dismiss} aria-label="Dismiss message">
        <XIcon size={18} />
      </button>
    </div>
  );
}
