import { afterEach, expect, test, vi } from "vitest";

import { createPrintPdf, printResume } from "./print";

const printFrame = () =>
  document.querySelector<HTMLIFrameElement>("#resumePrintFrame");

afterEach(() => {
  printFrame()?.remove();
  vi.unstubAllGlobals();
});

test("the print PDF is one page on a white background", () => {
  const pdf = createPrintPdf();
  const fills = pdf
    .output()
    .split("\n")
    .filter((line) => / g$/.test(line));

  expect(pdf.getNumberOfPages()).toBe(1);
  // The panels paint first, in the light theme's white.
  expect(fills[0]).toBe("1. g");
});

test("printing loads the PDF into one unseen frame and prints it", () => {
  // jsdom has no object URLs.
  let nextUrl = 0;
  const revokeObjectURL = vi.fn();
  vi.stubGlobal(
    "URL",
    Object.assign(class extends URL {}, {
      createObjectURL: () => `blob:resume-${++nextUrl}`,
      revokeObjectURL,
    }),
  );

  printResume();
  const first = printFrame();
  expect(first?.getAttribute("src")).toBe("blob:resume-1");
  expect(first?.style.opacity).toBe("0");
  expect(first?.getAttribute("aria-hidden")).toBe("true");

  const contentWindow = first?.contentWindow;
  if (!contentWindow) throw new Error("The print frame has no window");
  const print = vi.spyOn(contentWindow, "print").mockReturnValue(undefined);
  first?.dispatchEvent(new Event("load"));
  expect(print).toHaveBeenCalledOnce();

  printResume();
  expect(first?.isConnected).toBe(false);
  expect(revokeObjectURL).toHaveBeenCalledWith(first?.src);
  expect(document.querySelectorAll("#resumePrintFrame")).toHaveLength(1);
  expect(printFrame()?.getAttribute("src")).toBe("blob:resume-2");
});
