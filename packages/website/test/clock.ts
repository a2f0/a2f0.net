import { browser } from "@wdio/globals";

/**
 * Drives the animation clock by hand, so any moment can be drawn on demand
 * and drawn again.
 */
export const freezeClock = () =>
  browser.addInitScript(() => {
    let now = 0;
    let queue: FrameRequestCallback[] = [];
    performance.now = () => now;
    window.requestAnimationFrame = (callback) => queue.push(callback);
    window.cancelAnimationFrame = () => undefined;
    Object.assign(window, {
      drawAt: (time: number) => {
        now = time;
        const callbacks = queue;
        queue = [];
        for (const callback of callbacks) callback(time);
      },
    });
  });

/** Draws the frame at a moment, in ms, with the frozen clock. */
export const drawAt = (time: number) =>
  browser.execute((at: number) => {
    (window as unknown as { drawAt: (t: number) => void }).drawAt(at);
  }, time);
