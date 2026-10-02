// Opens a terminal window around the artwork: a frame with a title bar above
// the art and a prompt below it. Opening zooms a trail of outlines out from
// the square on the toolbar to the frame, and closing zooms them back in.

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

// How many outlines trail from the square, and how far apart they set off.
export const LINES = 8;
const STAGGER = 30;
// How long each outline takes to travel, in ms.
const TRAVEL = 450;
// How long the frame takes to fade in once the outlines reach it, or out.
const FADE = 150;
/** How long opening or closing takes, in ms. */
export const ZOOM_MS = (LINES - 1) * STAGGER + TRAVEL;

const placed = ({ x, y, width, height }: Box) => ({
  left: `${x}px`,
  top: `${y}px`,
  width: `${width}px`,
  height: `${height}px`,
});

export class TerminalWindow {
  readonly #canvas: HTMLElement;
  readonly #frame: HTMLElement;
  readonly #reducedMotion: MediaQueryList;
  #animations: Animation[] = [];
  #closing = false;

  /**
   * @param canvas The element holding the artwork, which the window wraps.
   * @param frame The window's frame, shown while the canvas is marked open.
   */
  constructor(
    canvas: HTMLElement,
    frame: HTMLElement,
    reducedMotion: MediaQueryList,
  ) {
    this.#canvas = canvas;
    this.#frame = frame;
    this.#reducedMotion = reducedMotion;
  }

  /**
   * Opens the window, zooming out from an element. Resolves false when a
   * later change interrupts it.
   */
  open(from: Element): Promise<boolean> {
    this.#cancel();
    this.#canvas.dataset.window = "";
    if (this.#reducedMotion.matches) return Promise.resolve(true);
    return this.#play([
      ...this.#zoom(this.#boxOf(from), this.#boxOf(this.#frame)),
      this.#frame.animate(
        { opacity: [0, 1] },
        { duration: FADE, delay: ZOOM_MS - FADE, fill: "backwards" },
      ),
    ]);
  }

  /**
   * Closes the window, zooming back into an element. Resolves false when a
   * later change interrupts it.
   */
  async close(to: Element): Promise<boolean> {
    this.#cancel();
    if (!this.#reducedMotion.matches) {
      this.#closing = true;
      const played = await this.#play([
        this.#frame.animate(
          { opacity: [1, 0] },
          { duration: FADE, fill: "forwards" },
        ),
        ...this.#zoom(this.#boxOf(this.#frame), this.#boxOf(to)),
      ]);
      if (!played) return false;
    }
    this.#closing = false;
    delete this.#canvas.dataset.window;
    // The faded frame stays hidden with the window, ready to open again.
    this.#cancel();
    return true;
  }

  /**
   * Stops opening or closing at once, removing the outlines. A window that
   * was opening stays open, and one that was closing closes.
   */
  cancel() {
    const closing = this.#closing;
    this.#cancel();
    if (closing) delete this.#canvas.dataset.window;
  }

  // Where an element sits within the canvas.
  #boxOf(element: Element): Box {
    const canvas = this.#canvas.getBoundingClientRect();
    const { left, top, width, height } = element.getBoundingClientRect();
    return { x: left - canvas.left, y: top - canvas.top, width, height };
  }

  // Sends a trail of outlines from one box to another, each fading in as it
  // sets off and out as it arrives.
  #zoom(from: Box, to: Box): Animation[] {
    return Array.from({ length: LINES }, (_, i) => {
      const line = document.createElement("div");
      line.className = "zoom-line";
      this.#canvas.append(line);
      const animation = line.animate(
        [
          { ...placed(from), opacity: 0 },
          { opacity: 1, offset: 0.15 },
          { opacity: 1, offset: 0.7 },
          { ...placed(to), opacity: 0 },
        ],
        {
          duration: TRAVEL,
          delay: i * STAGGER,
          easing: "cubic-bezier(0.25, 0.6, 0.3, 1)",
          // Faded out at both ends, until the outline is removed.
          fill: "both",
        },
      );
      const remove = () => line.remove();
      animation.finished.then(remove, remove);
      return animation;
    });
  }

  #play(animations: Animation[]): Promise<boolean> {
    this.#animations = animations;
    return Promise.all(animations.map(({ finished }) => finished)).then(
      () => true,
      () => false,
    );
  }

  #cancel() {
    this.#closing = false;
    for (const animation of this.#animations) animation.cancel();
    this.#animations = [];
  }
}
