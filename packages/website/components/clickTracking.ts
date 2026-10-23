import { createTracker } from "@a2f0/ct-client";

import { isMiniAppId } from "../mini-apps/types";

// Only known, static routes leave the page. Unknown paths, nested segments,
// search parameters, and fragments never become analytics dimensions.
export function trackingPage(pathname: string): string {
  const match = /^\/app\/([^/]+)\/?$/.exec(pathname);
  return match && isMiniAppId(match[1]) ? `/app/${match[1]}` : "/";
}

/** One tracker for the hosting website, including its open shadow roots. */
export function startClickTracking(): (() => void) | undefined {
  if (
    process.env.NODE_ENV !== "production" ||
    typeof window === "undefined" ||
    window.location.origin !== "https://a2f0.net"
  ) {
    return;
  }

  const tracker = createTracker({
    site: "a2f0-net",
    app: "website",
    environment: "production",
    capture: "all",
    overrideGpc: true,
    page: () => trackingPage(window.location.pathname),
  });
  tracker.init();
  return () => tracker.destroy();
}
