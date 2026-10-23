import { expect, test } from "bun:test";
import { mkdir, mkdtemp, realpath, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { write } from "bun";
import { cruise, type IModule } from "dependency-cruiser";

import {
  CRUISE_OPTIONS,
  findGraphViolations,
  type WorkspaceManifest,
} from "./architecturePolicy";

const MANIFESTS = new Map<string, WorkspaceManifest>([
  ["demo", { name: "@a2f0/demo" }],
  ["drive", { name: "@a2f0/drive" }],
  ["resume", { name: "@resume/site" }],
  ["shared", { name: "@a2f0/shared" }],
  [
    "website",
    {
      name: "@a2f0/website",
      dependencies: { "@a2f0/demo": "workspace:*" },
      devDependencies: { "dev-only": "1.0.0" },
    },
  ],
]);

// Each file breaks the rules named after it.
const SOURCES = {
  // not-to-dev-dep, though a type-only import of a devDependency is fine.
  "packages/website/app.ts":
    'import type { Value } from "dev-only/types";\nimport { value } from "dev-only";\nimport { site } from "@a2f0/demo/site";\nexport const app: Value = value + site;\n',
  // A type-only import cycle within a workspace: no-circular.
  "packages/shared/a.ts":
    'import type { B } from "./b";\nexport type A = B;\nexport const a = 1;\n',
  "packages/shared/b.ts":
    'import { a } from "./a";\nexport type B = 1;\nexport const b = a;\n',
  // A relative import of a workspace outside the resume's layers.
  "packages/resume/page.ts":
    'import { site } from "../demo/site";\nexport const page = site;\n',
  // An import of a workspace above the demo, which closes a cycle.
  "packages/demo/site.ts":
    'import { app } from "@a2f0/website/app";\nexport const site = 1;\nexport const loop = app;\n',
  // A root script importing app code by a relative path.
  "scripts/tool.ts":
    'import { a } from "../packages/shared/a";\nexport const tool = a;\n',
};

test("the rules catch each kind of violation", async () => {
  // The real path, as dependency-cruiser resolves through symlinks such as
  // macOS's /var.
  const fixture = await realpath(
    await mkdtemp(join(tmpdir(), "a2f0-architecture-")),
  );
  try {
    for (const [name, manifest] of MANIFESTS) {
      await write(
        join(fixture, "packages", name, "package.json"),
        JSON.stringify(manifest),
      );
      const link = join(fixture, "node_modules", manifest.name);
      await mkdir(dirname(link), { recursive: true });
      await symlink(join(fixture, "packages", name), link);
    }
    await write(
      join(fixture, "node_modules/dev-only/package.json"),
      '{"name":"dev-only","version":"1.0.0","main":"index.js"}',
    );
    await write(
      join(fixture, "node_modules/dev-only/index.js"),
      "exports.value = 1;",
    );
    await write(
      join(fixture, "node_modules/dev-only/types.d.ts"),
      "export type Value = number;",
    );
    for (const [path, source] of Object.entries(SOURCES)) {
      await write(join(fixture, path), source);
    }

    const { output } = await cruise(Object.keys(SOURCES), {
      ...CRUISE_OPTIONS,
      baseDir: fixture,
    });
    if (typeof output === "string") throw new Error(output);
    const violations = output.summary.violations.map(
      ({ rule, from, to }) => `${rule.name}: ${from} → ${to}`,
    );
    // dependency-cruiser reports each cycle once, from its first module.
    expect(violations.toSorted()).toEqual([
      "demo-imports-only-its-layers: packages/demo/site.ts → packages/website/app.ts",
      "no-circular: packages/demo/site.ts → packages/website/app.ts",
      "no-circular: packages/shared/a.ts → packages/shared/b.ts",
      "no-relative-imports-across-workspaces: packages/resume/page.ts → packages/demo/site.ts",
      "no-relative-imports-across-workspaces: scripts/tool.ts → packages/shared/a.ts",
      "not-to-dev-dep: packages/website/app.ts → node_modules/dev-only/index.js",
      "resume-imports-only-its-layers: packages/resume/page.ts → packages/demo/site.ts",
      "scripts-do-not-import-workspaces: scripts/tool.ts → packages/shared/a.ts",
    ]);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

// A module importing each of the given resolved paths.
const importer = (source: string, ...resolved: string[]) =>
  ({
    source,
    dependencies: resolved.map((path) => ({ resolved: path })),
  }) as unknown as IModule;

test("the graph check passes declared workspace imports", () => {
  expect(
    findGraphViolations(
      [importer("packages/website/app.ts", "packages/demo/site.ts")],
      MANIFESTS,
    ),
  ).toEqual([]);
});

test("the graph check flags undeclared and unresolved workspace imports", () => {
  expect(
    findGraphViolations(
      [importer("packages/website/app.ts", "packages/shared/a.ts")],
      MANIFESTS,
    ),
  ).toEqual([
    "packages/website declares @a2f0/demo, but no import resolved to packages/demo",
    "packages/website imports packages/shared without declaring it in its package.json",
  ]);
});

test("the graph check flags workspaces WORKSPACE_LAYERS does not cover", () => {
  const manifests = new Map(MANIFESTS);
  manifests.delete("shared");
  manifests.set("blog", { name: "@a2f0/blog" });
  expect(findGraphViolations([], manifests)).toEqual([
    "packages/blog is missing from WORKSPACE_LAYERS",
    "WORKSPACE_LAYERS names packages/shared, which is gone",
    "packages/website declares @a2f0/demo, but no import resolved to packages/demo",
  ]);
});
