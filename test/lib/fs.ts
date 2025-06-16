import fs from "node:fs";
import path from "node:path";

export default function waitForFileExists(filePath: string, timeout: number) {
  return new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      watcher.close();
      reject(
        new Error(
          `File did not exist and was not created during the timeout: ${filePath}`,
        ),
      );
    }, timeout);

    fs.access(filePath, fs.constants.R_OK, (err) => {
      if (!err) {
        clearTimeout(timer);
        watcher.close();
        resolve();
      }
    });

    const dir = path.dirname(filePath);
    const basename = path.basename(filePath);
    const watcher = fs.watch(dir, (eventType, filename) => {
      if (eventType === "rename" && filename === basename) {
        clearTimeout(timer);
        watcher.close();
        resolve();
      }
    });
  });
}
