import { expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

test("resume generators read and write the package from a parent workspace", async () => {
  const caller = await mkdtemp(join(tmpdir(), "resume build "));
  const source = resolve(import.meta.dirname, "..");
  const project = join(caller, "checkouts/example/packages/resume");
  try {
    await mkdir(join(project, "out"), { recursive: true });
    await mkdir(join(project, "public"));
    await cp(join(source, "package.json"), join(project, "package.json"));
    await cp(join(source, "scripts"), join(project, "scripts"), {
      recursive: true,
    });
    for (const name of ["lib", "node_modules"]) {
      await symlink(join(source, name), join(project, name), "dir");
    }
    const schemaCheck = relative(
      caller,
      join(project, "scripts/checks/ajv.ts"),
    );
    expect(
      execFileSync(schemaCheck, { cwd: caller, encoding: "utf8" }),
    ).toContain("JSON is valid.");
    const robots = "User-agent: *\nDisallow: /fixture\n";
    await writeFile(join(project, "public/robots.txt"), robots);
    for (const name of ["writeCrawlerFiles", "generateDesktopSvg"]) {
      execFileSync(
        "node",
        [
          "--import",
          import.meta.resolve("tsx"),
          relative(caller, join(project, "scripts/build", `${name}.ts`)),
        ],
        {
          cwd: caller,
          env: { ...process.env, RESUME_DEPLOY_TIER: "staging" },
        },
      );
    }
    expect(await readFile(join(project, "out/robots.txt"), "utf8")).toBe(
      robots,
    );
    expect(
      await readFile(join(project, ".generated/desktop.svg"), "utf8"),
    ).toContain("<svg");
  } finally {
    await rm(caller, { recursive: true, force: true });
  }
}, 30_000);
