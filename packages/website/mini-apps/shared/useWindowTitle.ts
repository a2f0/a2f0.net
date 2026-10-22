import { useCurrentWindow, useWindowActions } from "@tearleads/windowing";
import { useEffect } from "react";

/**
 * Names what the app shows, such as a song, in its window's title, and so in
 * its taskbar button: "Undertow — dnbm". Without a `detail`, and once the app
 * unmounts (its window minimized or closed), the window shows the app's own
 * title, as the start menu does.
 */
export function useWindowTitle(appTitle: string, detail: string | null) {
  const id = useCurrentWindow()?.id;
  const { updateTitle } = useWindowActions();
  const title = detail ? `${detail} — ${appTitle}` : appTitle;

  useEffect(() => {
    if (id === undefined) return;
    updateTitle(id, title);
    return () => updateTitle(id, appTitle);
  }, [appTitle, id, title, updateTitle]);
}
