// The dependency rules the architecture check enforces with dependency-cruiser,
// adapted from Tearleads' architecture lint for this smaller repository.
import type {
  ICruiseOptions,
  IForbiddenRuleType,
  IModule,
} from "dependency-cruiser";

/**
 * The workspace packages each package may import, keeping them layered: the
 * website and the shared resume code are leaves, the resume builds on the
 * shared code, and the experiment on both. Nothing imports the resume or the
 * experiment, so no import between packages can close a cycle.
 */
const WORKSPACE_LAYERS = {
  experiment: ["shared", "website"],
  resume: ["shared"],
  shared: [],
  website: [],
} as const satisfies Record<string, readonly string[]>;

/** The parts of a workspace's package.json the check reads. */
export interface WorkspaceManifest {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

// Tests, type declarations, build scripts, and tool configuration run only
// while developing, so they may import devDependencies and need no importer.
const DEVELOPMENT_MODULE = [
  "\\.test\\.[jt]sx?$",
  "\\.d\\.ts$",
  "/(__tests__|scripts|test)/",
  "/(next|vite)\\.config\\.ts$",
  "/vitest\\.setup\\.ts$",
  "/wdio\\.[^/]*conf\\.ts$",
];

const layerRules = Object.entries(WORKSPACE_LAYERS).map(
  ([name, layers]): IForbiddenRuleType => ({
    name: `${name}-imports-only-its-layers`,
    severity: "error",
    comment: `packages/${name} may import ${
      layers.length > 0
        ? layers.map((layer) => `packages/${layer}`).join(" and ")
        : "no other workspace"
    }; see WORKSPACE_LAYERS.`,
    from: { path: `^packages/${name}/` },
    to: {
      path: "^packages/",
      pathNot: `^packages/(${[name, ...layers].join("|")})/`,
    },
  }),
);

const FORBIDDEN_RULES: IForbiddenRuleType[] = [
  {
    name: "no-circular",
    severity: "error",
    comment:
      "Circular imports, type-only ones included, make module initialization order fragile and usually signal a boundary leak.",
    from: {},
    to: { circular: true },
  },
  {
    name: "not-to-unresolvable",
    severity: "error",
    comment:
      "Every import should resolve, apart from Bun's own modules. TypeScript checks declaration files, some of which reference types Next.js generates while building.",
    from: { pathNot: "\\.d\\.ts$" },
    to: { couldNotResolve: true, pathNot: "^bun(:|$)" },
  },
  {
    name: "no-non-package-json",
    severity: "error",
    comment:
      "npm imports must be declared in the importing workspace's package.json.",
    from: {},
    to: { dependencyTypes: ["npm-no-pkg", "npm-unknown"] },
  },
  {
    name: "not-to-dev-dep",
    severity: "error",
    comment:
      "Code the apps ship must declare what it imports as dependencies, not devDependencies.",
    from: { path: "^packages/", pathNot: DEVELOPMENT_MODULE },
    to: { dependencyTypes: ["npm-dev"], dependencyTypesNot: ["type-only"] },
  },
  {
    name: "no-duplicate-dep-types",
    severity: "error",
    comment:
      "A package should be declared in only one section of a package.json.",
    from: {},
    to: { moreThanOneDependencyType: true },
  },
  {
    name: "no-orphans",
    severity: "error",
    comment:
      "A module that imports nothing and that nothing imports is usually dead or misplaced.",
    from: { orphan: true, pathNot: DEVELOPMENT_MODULE },
    to: {},
  },
  {
    name: "no-relative-imports-across-workspaces",
    severity: "error",
    comment:
      "Import another workspace by the package name its package.json declares, not by a relative path.",
    from: { path: "^(packages/[^/]+|scripts)/" },
    to: { dependencyTypes: ["local"], pathNot: "^$1/" },
  },
  {
    name: "scripts-do-not-import-workspaces",
    severity: "error",
    comment:
      "The root scripts are repository tooling and must not depend on app code.",
    from: { path: "^scripts/" },
    to: { path: "^packages/" },
  },
  ...layerRules,
];

/** The cruise options for the files the check passes in. */
export const CRUISE_OPTIONS: ICruiseOptions = {
  ruleSet: { forbidden: FORBIDDEN_RULES },
  validate: true,
  // TypeScript 7 has no JavaScript API for dependency-cruiser to parse with.
  parser: "swc",
  // Keep npm packages as leaves, so the rules see their declarations without
  // walking their code.
  doNotFollow: { path: "node_modules" },
  enhancedResolveOptions: {
    conditionNames: ["import", "require", "default"],
    exportsFields: ["exports"],
  },
};

const workspaceOf = (path: string) => /^packages\/([^/]+)\//.exec(path)?.[1];

/**
 * Finds what the rules alone cannot: a workspace missing from
 * WORKSPACE_LAYERS, which no layer rule then covers, an import of a workspace
 * the importer does not declare, and a declared workspace dependency no import
 * resolved to, which would leave the layer rules nothing to check.
 *
 * @param modules The cruised modules.
 * @param manifests Each workspace's package.json, by its directory's name.
 */
export const findGraphViolations = (
  modules: readonly IModule[],
  manifests: ReadonlyMap<string, WorkspaceManifest>,
): string[] => {
  const violations: string[] = [];
  const layered = new Set<string>(Object.keys(WORKSPACE_LAYERS));
  for (const name of manifests.keys()) {
    if (!layered.delete(name)) {
      violations.push(`packages/${name} is missing from WORKSPACE_LAYERS`);
    }
  }
  for (const name of layered) {
    violations.push(`WORKSPACE_LAYERS names packages/${name}, which is gone`);
  }

  const imported = new Map<string, Set<string>>();
  for (const module of modules) {
    const from = workspaceOf(module.source);
    if (!from) continue;
    for (const { resolved } of module.dependencies) {
      const to = workspaceOf(resolved);
      if (!to || to === from) continue;
      const targets = imported.get(from) ?? new Set();
      imported.set(from, targets.add(to));
    }
  }

  const directories = new Map(
    [...manifests].map(([name, manifest]) => [manifest.name, name]),
  );
  for (const [name, manifest] of manifests) {
    const declared = new Set<string>();
    for (const [dependency, version] of Object.entries({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      const directory = directories.get(dependency);
      if (version === "workspace:*" && directory) declared.add(directory);
    }
    const reached = imported.get(name) ?? new Set();
    for (const directory of declared.difference(reached)) {
      violations.push(
        `packages/${name} declares ${manifests.get(directory)?.name}, but no import resolved to packages/${directory}`,
      );
    }
    for (const directory of reached.difference(declared)) {
      violations.push(
        `packages/${name} imports packages/${directory} without declaring it in its package.json`,
      );
    }
  }
  return violations;
};
