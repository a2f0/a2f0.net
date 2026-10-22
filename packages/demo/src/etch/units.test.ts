import { expect, test } from "bun:test";

import { copyOf } from "./units";

const element = (localName: string, attributes: Record<string, string>) =>
  ({
    localName,
    getAttribute: (name: string) => attributes[name] ?? null,
  }) as unknown as Element;

test("treats offset copies of a shape as one run", () => {
  expect(copyOf(element("use", { href: "#word" }))).toBe("#word");
  expect(
    copyOf(element("use", { href: "#word", transform: "translate(2 3)" })),
  ).toBe("#word");
});

test("keeps transformed copies and other elements apart", () => {
  expect(
    copyOf(element("use", { href: "#word", transform: "rotate(4)" })),
  ).toBeNull();
  expect(copyOf(element("path", { d: "M0 0" }))).toBeNull();
});
