import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn, spawnSync } from "bun";

// Resolve through the real owner so a stale nested resolution cannot pass.
// GHSA-gg6h-894w-4m9c: repeated lookbehind matching must not rescan the input
// from zero on every match. The vulnerable release exceeds this generous
// subprocess budget; the fixed engine handles the same input in milliseconds.
test("Markdownlint's regex engine bounds repeated lookbehind matching", () => {
  const cli = resolve(
    import.meta.dir,
    "../../node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs",
  );
  const result = spawnSync(
    [
      "node",
      "--input-type=module",
      "-e",
      `import { createRequire } from "node:module";
     import { realpathSync } from "node:fs";
     const cliRequire = createRequire(realpathSync(${JSON.stringify(cli)}));
     const ownerRequire = createRequire(realpathSync(cliRequire.resolve("markdownlint")));
     const { RE2JS } = ownerRequire("re2js");
     const matcher = RE2JS.compile("(?<=a)b", RE2JS.LOOKBEHINDS)
       .matcher("ab".repeat(32000));
     let matches = 0;
     while (matcher.find()) matches++;
     if (matches !== 32000) throw new Error("Incorrect lookbehind matches");
     console.log(matches);`,
    ],
    { timeout: 10000 },
  );
  expect(
    result.exitCode,
    result.stderr.toString() || "Regex subprocess timed out or failed",
  ).toBe(0);
  expect(result.stdout.toString().trim()).toBe("32000");
}, 20000);

test("the real Markdownlint CLI preserves TOML rule options, disabling and warning severity", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-markdownlint-test-"));
  const cli = resolve(
    import.meta.dir,
    "../../node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs",
  );
  const config = resolve(directory, ".markdownlint-cli2.toml");
  const document = resolve(directory, "fixture.md");
  async function lint(options: string, contents: string) {
    await writeFile(
      config,
      `[config]\ndefault = false\n[config.MD013]\nline_length = 12\nstrict = true\n${options}\n`,
    );
    await writeFile(document, contents);
    const child = spawn(["node", cli, "--config", config, document], {
      cwd: directory,
      stdout: "pipe",
      stderr: "pipe",
    });
    const [stdout, stderr, status] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    return { output: stdout + stderr, status };
  }
  try {
    expect((await lint("enabled = true", "# Fixture\n\nShort.\n")).status).toBe(
      0,
    );
    const violation = await lint(
      "enabled = true",
      "# Fixture\n\nThis line is twenty characters long.\n",
    );
    expect(violation.status).toBe(1);
    expect(violation.output).toContain("MD013");
    expect(violation.output).toContain("Expected: 12");
    expect(
      (
        await lint(
          "enabled = false",
          "# Fixture\n\nThis line is twenty characters long.\n",
        )
      ).status,
    ).toBe(0);
    const warning = await lint(
      'enabled = true\nseverity = "warning"',
      "# Fixture\n\nThis line is twenty characters long.\n",
    );
    expect(warning.status).toBe(0);
    expect(warning.output).toContain("MD013");
  } finally {
    await rm(directory, { recursive: true });
  }
});
