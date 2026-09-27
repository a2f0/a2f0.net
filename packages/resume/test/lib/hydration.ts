// Hydration on a loaded CI runner can take longer than an element wait; a
// page that never hydrates should say why instead of timing out silently.
const HYDRATION_TIMEOUT_MS = 30000;

const hydrationState = (selector: string) =>
  browser.execute((target: string) => {
    const element = document.querySelector(target);
    const statuses = new Map(
      performance
        .getEntriesByType("resource")
        .map((entry) => [
          entry.name,
          (entry as PerformanceResourceTiming).responseStatus,
        ]),
    );
    // Blocked or failed requests still get a timing entry, with status 0.
    const unloadedScripts = Array.from(document.scripts, (script) => script.src)
      .filter((src) => src.startsWith(window.location.origin))
      .flatMap((src) => {
        const status = statuses.get(src);
        return status !== undefined && status >= 200 && status < 400
          ? []
          : [`${new URL(src).pathname} (${status ?? "pending"})`];
      });
    return {
      // React tags each DOM node it hydrates with a __reactFiber$ key.
      hydrated:
        element !== null &&
        Object.keys(element).some((key) => key.startsWith("__reactFiber$")),
      readyState: document.readyState,
      nextBooted: "next" in window,
      unloadedScripts,
    };
  }, selector);

/** Wait until React has hydrated `selector`, reporting why if it does not. */
export default async function waitForHydration(
  selector: string,
  timeout = HYDRATION_TIMEOUT_MS,
): Promise<void> {
  try {
    await browser.waitUntil(
      async () => (await hydrationState(selector)).hydrated,
      { timeout, interval: 100 },
    );
  } catch {
    throw new Error(
      `${selector} did not hydrate within ${timeout}ms: ` +
        JSON.stringify(await hydrationState(selector)),
    );
  }
}
