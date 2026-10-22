// Keeps the ASCII <pre> rendered at a column count that suits its width.

import { type Artwork, loadArtwork } from "./artwork";
import { type AsciiArt, type Layer, type Run, renderAscii } from "./render";

export const columnsFor = (width: number) =>
  Math.round(Math.min(Math.max(width / 7, 96), 200));

/** The art on show, cell by cell. */
export interface Grid {
  columns: number;
  /** Each row's text. */
  rows: string[];
  /** Each cell's layer, row by row. */
  layers: Layer[][];
}

/** A run placed in the art, from its row and first column. */
export interface Placed extends Run {
  row: number;
  column: number;
}

/**
 * The part of a run shown when each column is revealed down to a depth: its
 * characters above that row, and blanks below.
 */
export const writtenPart = (
  { row, column, text }: Placed,
  depths: ArrayLike<number>,
) => {
  let part = "";
  for (let i = 0; i < text.length; i++) {
    part += row < depths[column + i] ? text[i] : " ";
  }
  return part;
};

export class AsciiDisplay {
  /** Whether the ASCII has been rendered at least once. */
  ready = false;
  readonly #pre: HTMLElement;
  readonly #width: () => number;
  readonly #rendered: () => void;
  readonly #renderArt: (columns: number) => Promise<AsciiArt>;
  #artwork?: Promise<Artwork>;
  #columns = 0;
  #drawing: Promise<void> = Promise.resolve();
  #grid?: Grid;
  #runs: (Placed & { node: Text })[] = [];

  /**
   * @param render Renders the art at a column count. It defaults to loading
   * and rasterizing a2f0.svg; tests supply their own.
   */
  constructor(
    pre: HTMLElement,
    width: () => number,
    rendered: () => void,
    render?: (columns: number) => Promise<AsciiArt>,
  ) {
    this.#pre = pre;
    this.#width = width;
    this.#rendered = rendered;
    this.#renderArt = render ?? ((columns) => this.#render(columns));
  }

  /** Whether a render has been started and has not since failed. */
  get requested() {
    return this.#columns > 0;
  }

  /** The art last rendered; a new object whenever it is rendered afresh. */
  get grid(): Grid | undefined {
    return this.#grid;
  }

  /** Renders for the current width, reusing a render already under way. */
  draw(): Promise<void> {
    const next = columnsFor(this.#width());
    if (next === this.#columns) return this.#drawing;
    this.#columns = next;
    this.#drawing = this.#renderArt(next).then(
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

  /** Drops any render under way, which then never writes to the pre. */
  abandon() {
    this.#columns = 0;
  }

  /**
   * Shows each column of the art only down to a depth, in rows, or the whole
   * art without depths.
   */
  reveal(depths?: ArrayLike<number>) {
    for (const run of this.#runs) {
      const text = depths ? writtenPart(run, depths) : run.text;
      if (run.node.data !== text) run.node.data = text;
    }
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
    const runs: (Placed & { node: Text })[] = [];
    this.#pre.replaceChildren(
      ...lines.flatMap((line, row) => {
        let column = 0;
        return [
          ...line.map(({ layer, text }) => {
            const node = document.createTextNode(text);
            runs.push({ layer, text, row, column, node });
            column += text.length;
            if (!layer) return node;
            const span = document.createElement("span");
            span.className = layer;
            span.append(node);
            return span;
          }),
          "\n",
        ];
      }),
    );
    this.#runs = runs;
    this.#grid = {
      columns,
      rows: lines.map((line) => line.map(({ text }) => text).join("")),
      layers: lines.map((line) =>
        line.flatMap(({ layer, text }) =>
          Array<Layer>(text.length).fill(layer),
        ),
      ),
    };
  }
}
