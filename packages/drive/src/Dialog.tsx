import { XIcon } from "@phosphor-icons/react";
import { type ReactNode, useEffect, useRef } from "react";
import { ErrorNotice } from "./ErrorNotice";

export function Dialog({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose(): void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`drive-dialog ${wide ? "drive-dialog-wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      aria-label={title}
    >
      <div className="drive-dialog-heading">
        <h2>{title}</h2>
        <button
          className="drive-icon-button"
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <XIcon size={20} />
        </button>
      </div>
      <ErrorNotice />
      {children}
    </dialog>
  );
}
