// Stacks the graffiti SVG and its ASCII rendering. A lens that follows the
// pointer reveals the view underneath, and clicking floods the lens to swap.
// The play button animates the view on show: a laser etches the SVG in, and
// falling code writes the ASCII. The square opens a terminal window around it.

import { AsciiDisplay } from "./ascii/display";
import { Etcher } from "./etch/etcher";
import { Lens, type Point } from "./lens";
import { Rain } from "./rain/rain";
import { TerminalWindow } from "./terminal";

const find = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Missing ${selector}`);
  return element;
};

const main = find<HTMLElement>("main");
const canvas = find<HTMLElement>(".canvas");
const stage = find<HTMLElement>(".stage");
const graffiti = find<HTMLImageElement>(".graffiti");
const ascii = find<HTMLPreElement>(".ascii");
const toggle = find<HTMLButtonElement>(".view-toggle");
const play = find<HTMLButtonElement>(".play-toggle");
const windowToggle = find<HTMLButtonElement>(".window-toggle");

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const lens = new Lens(stage, reducedMotion);
const display = new AsciiDisplay(
  ascii,
  () => main.clientWidth,
  () => settle(),
);
const etcher = new Etcher(stage, graffiti);
const rain = new Rain(stage, ascii, display);
const terminal = new TerminalWindow(
  canvas,
  find<HTMLElement>(".window"),
  reducedMotion,
);

let pointer: Point | undefined;
let flooding = false;

const animating = () => etcher.playing || rain.playing;
const stopAnimating = () => {
  etcher.stop();
  rain.stop();
};

// The lens stays shut while an animation plays over the artwork.
const settle = () => {
  if (!flooding) {
    lens.peek(pointer !== undefined && display.ready && !animating());
  }
};

const shown = () => stage.dataset.view === "ascii";
const wanted = () => toggle.getAttribute("aria-pressed") === "true";

// The play button names the animation of the view the toggle picks.
const labelPlay = () => {
  const action = play.dataset.playing === undefined ? "Play" : "Stop";
  const text = `${action} ${wanted() ? "code rain" : "etching"} animation`;
  play.setAttribute("aria-label", text);
  play.title = text;
};

const show = async (asAscii: boolean, origin?: Point): Promise<void> => {
  toggle.setAttribute("aria-pressed", String(asAscii));
  labelPlay();
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
  if (!flooding && !animating()) show(!shown(), lens.locate(event));
});

let resizeTimer: ReturnType<typeof setTimeout> | undefined;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (display.requested) display.draw().catch(console.error);
  }, 200);
});
toggle.addEventListener("click", () => {
  stopAnimating();
  show(!wanted());
});
toggle.hidden = false;

play.addEventListener("click", async () => {
  if (animating()) return stopAnimating();
  if (flooding) return;
  // The etching draws the SVG, and the code rain writes the ASCII, so each
  // waits for its view to be on show.
  const asAscii = wanted();
  if (shown() !== asAscii) await show(asAscii);
  if (shown() !== asAscii || animating()) return;
  play.dataset.playing = "";
  labelPlay();
  const playing = (asAscii ? rain : etcher).play();
  settle();
  try {
    await playing;
  } catch (error) {
    console.error(error);
  } finally {
    delete play.dataset.playing;
    labelPlay();
    settle();
  }
});
play.hidden = false;

// The window zooms out of, and back into, the square drawn on its toggle.
windowToggle.addEventListener("click", () => {
  const open = windowToggle.getAttribute("aria-pressed") !== "true";
  windowToggle.setAttribute("aria-pressed", String(open));
  const square = windowToggle.querySelector("rect") ?? windowToggle;
  (open ? terminal.open(square) : terminal.close(square)).catch(console.error);
});
windowToggle.hidden = false;
if (window.matchMedia("(hover: hover)").matches) {
  // Safari has no idle callbacks.
  const idle = window.requestIdleCallback ?? setTimeout;
  idle(warm);
}
