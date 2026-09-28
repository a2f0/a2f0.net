// Stacks the graffiti SVG and its ASCII rendering. A lens that follows the
// pointer reveals the view underneath, and clicking floods the lens to swap.
// The play button etches the SVG in with a laser.

import { AsciiDisplay } from "./ascii/display";
import { Etcher } from "./etch/etcher";
import { Lens, type Point } from "./lens";

const find = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};

const main = find<HTMLElement>("main");
const stage = find<HTMLElement>(".stage");
const graffiti = find<HTMLImageElement>(".graffiti");
const ascii = find<HTMLPreElement>(".ascii");
const toggle = find<HTMLButtonElement>(".view-toggle");
const play = find<HTMLButtonElement>(".play-toggle");

const lens = new Lens(
  stage,
  window.matchMedia("(prefers-reduced-motion: reduce)"),
);
const display = new AsciiDisplay(
  ascii,
  () => main.clientWidth,
  () => settle(),
);
const etcher = new Etcher(stage, graffiti);

let pointer: Point | undefined;
let flooding = false;

// The lens stays shut while the etching plays over the artwork.
const settle = () => {
  if (!flooding) {
    lens.peek(pointer !== undefined && display.ready && !etcher.playing);
  }
};

const shown = () => stage.dataset.view === "ascii";
const wanted = () => toggle.getAttribute("aria-pressed") === "true";

const show = async (asAscii: boolean, origin?: Point): Promise<void> => {
  toggle.setAttribute("aria-pressed", String(asAscii));
  try {
    if (asAscii) await display.draw();
  } catch (error) {
    console.error(error);
    return show(false);
  }
  // A later click wins over a render that was still in flight. A flood that
  // is already under way checks which view is wanted once it ends, so it is
  // left to finish rather than interrupted by a second one.
  if (wanted() !== asAscii || shown() === asAscii || flooding) return;
  if (origin) {
    flooding = true;
    const flooded = await lens.flood(origin);
    flooding = false;
    if (!flooded || wanted() !== asAscii) return settle();
  }
  stage.dataset.view = asAscii ? "ascii" : "svg";
  graffiti.ariaHidden = asAscii ? "true" : null;
  ascii.ariaHidden = asAscii ? null : "true";
  // The view that was on top is underneath now; reopen the lens onto it.
  lens.snap(0);
  if (pointer) lens.aim(pointer);
  settle();
};

// Renders once ahead of the first peek so the lens has something to reveal.
let warmed = false;
const warm = () => {
  if (warmed) return;
  warmed = true;
  display.draw().catch(console.error);
};

stage.addEventListener("pointermove", (event) => {
  // Touch has no hover, so a tap flips the view without peeking first.
  if (event.pointerType === "touch") return;
  // Touch-first devices can still have a mouse or trackpad attached.
  warm();
  pointer = lens.locate(event);
  if (flooding) return;
  lens.aim(pointer);
  settle();
});
stage.addEventListener("pointerleave", () => {
  pointer = undefined;
  settle();
});
stage.addEventListener("click", (event) => {
  if (!flooding && !etcher.playing) show(!shown(), lens.locate(event));
});

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (display.requested) display.draw().catch(console.error);
  }, 200);
});
toggle.addEventListener("click", () => {
  etcher.stop();
  show(!wanted());
});
toggle.hidden = false;

const label = (text: string) => {
  play.setAttribute("aria-label", text);
  play.title = text;
};
play.addEventListener("click", async () => {
  if (etcher.playing) return etcher.stop();
  if (flooding) return;
  // The etching draws the SVG, so it plays over that view.
  if (wanted()) await show(false);
  play.dataset.playing = "";
  label("Stop etching animation");
  const playing = etcher.play();
  settle();
  try {
    await playing;
  } catch (error) {
    console.error(error);
  } finally {
    delete play.dataset.playing;
    label("Play etching animation");
    settle();
  }
});
play.hidden = false;
if (window.matchMedia("(hover: hover)").matches) {
  // Safari has no idle callbacks.
  const idle = window.requestIdleCallback ?? setTimeout;
  idle(warm);
}
