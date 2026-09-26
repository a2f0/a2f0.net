import { expect, test, vi } from "vitest";

import { loadSvgFont } from "../../lib/svgFont";

test("font loading falls back when the request never settles", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("document", {
    fonts: {
      load: () =>
        new Promise<FontFace[]>(() => {
          // Simulate a stalled font request.
        }),
    },
  });

  try {
    const loading = loadSvgFont();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await loading).toBe(false);
  } finally {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  }
});
