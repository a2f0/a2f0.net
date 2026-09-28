import { expect, test } from "bun:test";

import { subpaths } from "./outlines";

test("splits absolute path data into its subpaths", () => {
  expect(subpaths("M0 0 10 0 10 10Z M2 2 4 2 4 4Z")).toEqual([
    "M0 0 10 0 10 10Z",
    "M2 2 4 2 4 4Z",
  ]);
});

test("keeps path data with relative moves whole", () => {
  const d = "M0 0 10 0 10 10z m2 2 2 0 0 2z";
  expect(subpaths(d)).toEqual([d]);
});
