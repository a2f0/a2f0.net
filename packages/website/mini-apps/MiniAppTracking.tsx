import type { PropsWithChildren } from "react";

import type { MiniAppId } from "./types";

// Covers window chrome as well as content. CSS keeps this geometry surface
// the same size as the desktop, without intercepting other windows' clicks.
export function MiniAppTracking({
  appId,
  children,
}: PropsWithChildren<{ appId: MiniAppId }>) {
  return (
    <div className="mini-app-tracking" data-ct-app={appId}>
      {children}
    </div>
  );
}
