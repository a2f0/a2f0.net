import { expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawn } from "bun";

test("the real Markdownlint CLI preserves TOML rule options, disabling and warning severity", async () => {
  const directory = await mkdtemp(resolve(tmpdir(), "a2f0-markdownlint-test-"));
  const cli = resolve(
    import.meta.dir,
    "../node_modules/markdownlint-cli2/markdownlint-cli2-bin.mjs",
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
