import fs from "node:fs";
import path from "node:path";

const POLL_INTERVAL_MS = 50;

// The SVG download may spend up to 2s loading its font and 2s fetching it
// before Chrome starts writing, and CI runs several browsers at once.
const DOWNLOAD_TIMEOUT_MS = 15000;

/**
 * Wait for a browser download to land and return its contents.
 *
 * Chrome writes to a `.crdownload` file and renames it into place when the
 * download completes, so a non-empty file at `filePath` is a finished
 * download. This polls rather than using `fs.watch`: a watcher started
 * alongside an existence check misses a file renamed into place between the
 * two, and then waits out its whole timeout.
 */
export default async function waitForDownload(
  filePath: string,
  timeout = DOWNLOAD_TIMEOUT_MS,
): Promise<Buffer> {
  const deadline = Date.now() + timeout;
  for (;;) {
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
      return fs.readFileSync(filePath);
    }
    if (Date.now() >= deadline) break;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  const dir = path.dirname(filePath);
  const contents = fs.existsSync(dir) ? fs.readdirSync(dir).join(", ") : "";
  throw new Error(
    `Download did not finish within ${timeout}ms: ${filePath} ` +
      `(download directory contains: ${contents || "nothing"})`,
  );
}
