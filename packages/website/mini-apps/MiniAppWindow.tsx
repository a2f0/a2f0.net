import { Window, type WindowEntry } from "@tearleads/windowing";
import type { PropsWithChildren } from "react";

import { MiniAppBoundary } from "./MiniAppBoundary";
import { isMiniAppId } from "./types";

// Gives a mini-app window the mini-app error boundary. Windows that no
// mini-app owns render bare.
function MiniAppWindowBoundary({
  children,
  entry,
}: PropsWithChildren<{ entry: WindowEntry }>) {
  if (!isMiniAppId(entry.appId)) return children;
  return <MiniAppBoundary appId={entry.appId}>{children}</MiniAppBoundary>;
}

/**
 * A mini-app's window. These mini-apps have no routes, so the toolbar has no
 * Back to offer: it shows only while an app registers toolbar actions.
 */
export function MiniAppWindow({ windowId }: { windowId: string }) {
  return (
    <Window
      ContentBoundary={MiniAppWindowBoundary}
      historyBack={false}
      windowId={windowId}
    />
  );
}
