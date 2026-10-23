import { createTracker } from "@a2f0/ct-client";

/** Only the standalone browser entrypoint starts tracking; imports stay inert. */
export function startClickTracking(): (() => void) | undefined {
  if (
    process.env.NODE_ENV !== "production" ||
    typeof window === "undefined" ||
    window.location.origin !== "https://resume.a2f0.net"
  ) {
    return;
  }

  const tracker = createTracker({
    site: "a2f0-net",
    app: "resume",
    environment: "production",
    capture: "all",
    overrideGpc: true,
    // Never collect file names, user paths, queries, or fragments.
    page: () => "/",
  });
  tracker.init();
  return () => tracker.destroy();
}
