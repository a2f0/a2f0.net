import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readdir, readFile, realpath } from "node:fs/promises";
import { resolve } from "node:path";

export async function fingerprintFile(path: string) {
  const canonical = await realpath(path);
  const hash = createHash("sha256").update(JSON.stringify(canonical));
  for await (const chunk of createReadStream(canonical)) hash.update(chunk);
  return hash.digest("hex");
}

export function checkToolVersions(
  pins: { bun: unknown; node: unknown; wrangler: unknown },
  actual: { bun: string; node: unknown; wrangler: unknown },
) {
  if (
    pins.bun !== `bun@${actual.bun}` ||
    pins.node !== `=${actual.node}` ||
    typeof pins.wrangler !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(pins.wrangler) ||
    pins.wrangler !== actual.wrangler
  ) {
    throw new Error(
      "Use the declared Bun, Node and installed Wrangler versions",
    );
  }
}

/** Hash file boundaries and paths, including Wrangler's special asset files. */
export async function digestAssets(directory: string) {
  const hash = createHash("sha256");
  let files = 0;
  async function visit(path: string, relative: string) {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${relative}/${entry.name}`;
      if (entry.isDirectory()) {
        hash.update(JSON.stringify(["directory", name]));
        await visit(resolve(path, entry.name), name);
      } else if (entry.isFile()) {
        const contents = await readFile(resolve(path, entry.name));
        hash.update(JSON.stringify(["file", name, contents.length]));
        hash.update(contents);
        files++;
      } else {
        throw new Error(
          "Asset symlinks or special files require a new safety review",
        );
      }
    }
  }
  await visit(directory, "");
  if (!files) throw new Error("The asset tree is empty");
  return hash.digest("hex");
}
