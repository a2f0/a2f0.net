// Keeps the ASCII <pre> rendered at a column count that suits its width.

import { type Artwork, loadArtwork } from "./artwork";
import { type AsciiArt, renderAscii } from "./render";

export const columnsFor = (width: number) =>
  Math.round(Math.min(Math.max(width / 7, 96), 200));

export class AsciiDisplay {
  /** Whether the ASCII has been rendered at least once. */
  ready = false;
  readonly #pre: HTMLElement;
  readonly #width: () => number;
  readonly #rendered: () => void;
  #artwork?: Promise<Artwork>;
  #columns = 0;
  #drawing: Promise<void> = Promise.resolve();

  constructor(pre: HTMLElement, width: () => number, rendered: () => void) {
    this.#pre = pre;
    this.#width = width;
    this.#rendered = rendered;
  }

  /** Whether a render has been started and has not since failed. */
  get requested() {
    return this.#columns > 0;
  }

  /** Renders for the current width, reusing a render already under way. */
  draw(): Promise<void> {
    const next = columnsFor(this.#width());
    if (next === this.#columns) return this.#drawing;
    this.#columns = next;
    this.#drawing = this.#render(next).then(
      (art) => {
        if (next !== this.#columns) return;
        this.#write(next, art);
        this.ready = true;
        this.#rendered();
      },
      (error) => {
        this.#columns = 0;
        throw error;
      },
    );
    return this.#drawing;
  }

  #render(columns: number): Promise<AsciiArt> {
    this.#artwork ??= loadArtwork(
      window.getComputedStyle(this.#pre).fontFamily,
    ).catch((error) => {
      this.#artwork = undefined;
      throw error;
    });
    return this.#artwork.then((artwork) => renderAscii(artwork, columns));
  }

  #write(columns: number, { ratio, lines }: AsciiArt) {
    this.#pre.style.setProperty("--columns", String(columns));
    this.#pre.style.setProperty("--ratio", String(ratio));
    this.#pre.replaceChildren(
      ...lines.flatMap((runs) => [
        ...runs.map(({ layer, text }) => {
          if (!layer) return text;
          const span = document.createElement("span");
          span.className = layer;
          span.textContent = text;
          return span;
        }),
        "\n",
      ]),
    );
  }
}
