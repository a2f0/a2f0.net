import { XIcon } from "@phosphor-icons/react";
import { createContext, useContext } from "react";

export const DriveErrorContext = createContext<{
  message: string | null;
  dismiss(): void;
  /** Set once the drive has closed: the notice stays until it reopens. */
  reopen?(): void;
}>({ message: null, dismiss: () => undefined });

export function ErrorNotice() {
  const { message, dismiss, reopen } = useContext(DriveErrorContext);
  if (!message) return null;
  return (
    <div className="drive-error" role="alert">
      <span>{message}</span>
      {reopen ? (
        <button type="button" className="drive-error-action" onClick={reopen}>
          Reopen Drive
        </button>
      ) : (
        <button type="button" onClick={dismiss} aria-label="Dismiss message">
          <XIcon size={18} />
        </button>
      )}
    </div>
  );
}
