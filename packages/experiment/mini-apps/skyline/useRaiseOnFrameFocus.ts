import { useCurrentWindow, useWindowActions } from "@tearleads/windowing";
import { useEffect } from "react";

/**
 * Brings the window to the front when focus moves into `frame`. A press
 * inside an iframe goes to the iframe's document, so the window never sees it
 * and does not raise itself as it does for presses on its own content. The
 * press still focuses the frame, which blurs the desktop's window.
 */
export function useRaiseOnFrameFocus(frame: HTMLIFrameElement | null) {
  const id = useCurrentWindow()?.id;
  const { bringToFront } = useWindowActions();

  useEffect(() => {
    if (!frame || id === undefined) return;
    const raise = () => {
      if (document.activeElement === frame) bringToFront(id);
    };
    window.addEventListener("blur", raise);
    return () => window.removeEventListener("blur", raise);
  }, [bringToFront, frame, id]);
}
