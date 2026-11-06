import { afterEach, expect, test, vi } from "vitest";

import { resumeConfiguration } from "./configuration";
import { downloadSvg } from "./downloads";

const {
  darkForegroundColor: foregroundColor,
  darkBackgroundColor: backgroundColor,
  darkHighlightColor: highlightColor,
} = resumeConfiguration;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("each SVG download releases its object URL once the download starts", async () => {
  vi.useFakeTimers();
  // jsdom has no object URLs, and the SVG font loads without a network here.
  let nextUrl = 0;
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: () => `blob:resume-${++nextUrl}`,
      revokeObjectURL,
    }),
  );
  vi.stubGlobal("fetch", () => Promise.reject(new Error("offline")));
  const clicked: string[] = [];
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    clicked.push(this.href);
  });

  await downloadSvg({ foregroundColor, backgroundColor, highlightColor });
  await downloadSvg({ foregroundColor, backgroundColor, highlightColor });

  expect(clicked).toEqual(["blob:resume-1", "blob:resume-2"]);
  // The browser reads the URL after the click returns, so it stays valid
  // until then.
  expect(revokeObjectURL).not.toHaveBeenCalled();
  await vi.runAllTimersAsync();
  expect(revokeObjectURL.mock.calls).toEqual([
    ["blob:resume-1"],
    ["blob:resume-2"],
  ]);
});
