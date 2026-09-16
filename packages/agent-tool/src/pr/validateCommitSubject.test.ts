import { execFileSync } from "node:child_process";
import { describe, expect, test } from "vitest";

import { validateCommitSubject } from "./validateCommitSubject";

const rootDir = execFileSync("git", ["rev-parse", "--show-toplevel"], {
  encoding: "utf8",
}).trim();

describe("validateCommitSubject", () => {
  test("accepts a valid conventional subject", () => {
    expect(() =>
      validateCommitSubject(rootDir, "feat(agent-tool): add squash merge"),
    ).not.toThrow();
  });

  test("accepts the conventional 'refactor' type", () => {
    expect(() =>
      validateCommitSubject(rootDir, "refactor: drop dead code"),
    ).not.toThrow();
  });

  test("rejects a non-conventional subject", () => {
    expect(() => validateCommitSubject(rootDir, "just some text")).toThrow(
      /commitlint/,
    );
  });

  test("rejects an unknown type", () => {
    expect(() =>
      validateCommitSubject(rootDir, "frobnicate: do a thing"),
    ).toThrow(/commitlint/);
  });

  test("enforces the repo's 100-char header limit", () => {
    const tooLong = `feat(agent-tool): ${"x".repeat(100)}`;
    expect(() => validateCommitSubject(rootDir, tooLong)).toThrow(/commitlint/);
  });
});
