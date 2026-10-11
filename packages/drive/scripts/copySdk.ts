import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const target = new URL("../public/", import.meta.url);
await mkdir(target, { recursive: true });
for (const name of ["worker.js", "sqlite3.wasm", "sqlite3-licenses.md"]) {
  await copyFile(
    fileURLToPath(import.meta.resolve(`@tearleads/client-sdk/sqlite/${name}`)),
    new URL(name, target),
  );
}
