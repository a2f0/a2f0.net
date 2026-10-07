// Plays the code rain over the ASCII view. Drops of mirrored code fall down
// every column of the container, on the art's own grid, white at the head and
// fading behind it. The last drop in each column writes the art: the
// characters it passes stay, cooling from white to their own shade, while the
// code around them fades away.

import type { AsciiDisplay, Grid } from "../ascii/display";
import type { Layer } from "../ascii/render";
import { codeAt } from "./code";
import {
  type Column,
  glowOf,
  headOf,
  rainEnd,
  schedule,
  writtenRows,
} from "./timeline";

// How bright code is just behind a drop's head, before it fades.
const TRAIL = 0.7;

/** Where the art's grid sits on the canvas, in CSS pixels. */
interface Layout {
  width: number;
  height: number;
  /** The left edge and top of the art's first cell. */
  left: number;
  top: number;
  /** How wide and tall each cell is. */
  cell: number;
  size: number;
  /** How far down each cell its baseline sits. */
  baseline: number;
}

/**
 * The cells the rain falls through: the art's grid, extended to the edges of
 * the canvas.
 */
interface Field {
  /** How many columns lie left of the art, and rows above it. */
  left: number;
  top: number;
  columns: number;
  rows: number;
}

interface Scene {
  grid: Grid;
  field: Field;
  /** The drops falling down each column of the field. */
  columns: Column[];
  end: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** The color each layer of the art settles to. */
  colors: Record<Layer, string>;
}

// How many cells it takes to cover a span, partly covering the last.
const cover = (span: number, unit: number) =>
  unit > 0 ? Math.max(Math.ceil(span / unit), 0) : 0;

export class Rain {
  readonly #container: HTMLElement;
  readonly #stage: HTMLElement;
  readonly #pre: HTMLElement;
  readonly #display: AsciiDisplay;
  #stop?: () => void;

  /**
   * @param container The element the rain fills.
   * @param stage The element holding the art, marked while the rain plays.
   * @param pre The ASCII art, which the rain writes.
   * @param display What renders the art into the pre.
   */
  constructor(
    container: HTMLElement,
    stage: HTMLElement,
    pre: HTMLElement,
    display: AsciiDisplay,
  ) {
    this.#container = container;
    this.#stage = stage;
    this.#pre = pre;
    this.#display = display;
  }

  get playing() {
    return this.#stop !== undefined;
  }

  /** Ends the rain at once, leaving the finished art. */
  stop() {
    this.#stop?.();
  }

  /** Plays the rain, resolving once it finishes or is stopped. */
  async play(): Promise<void> {
    const grid = this.#display.grid;
    if (this.playing || !grid) return;
    const scene = this.#build(grid);
    // Runs as the rain ends, so stop() leaves the art whole before it returns.
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      this.#stop = undefined;
      scene.canvas.remove();
      this.#display.reveal();
      delete this.#stage.dataset.raining;
    };
    try {
      await this.#run(scene, end);
    } finally {
      end();
    }
  }

  #build(grid: Grid): Scene {
    const canvas = document.createElement("canvas");
    canvas.className = "rain";
    canvas.setAttribute("aria-hidden", "true");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");
    const colorOf = (layer: Layer) => {
      const probe = document.createElement("span");
      if (layer) probe.className = layer;
      this.#pre.append(probe);
      const { color } = window.getComputedStyle(probe);
      probe.remove();
      return color;
    };
    this.#container.append(canvas);
    this.#stage.dataset.raining = "";
    const { width, height, left, top, cell, size } = this.#layout(canvas, ctx);
    const before = { columns: cover(left, cell), rows: cover(top, size) };
    const field = {
      left: before.columns,
      top: before.rows,
      columns:
        before.columns +
        grid.columns +
        cover(width - left - grid.columns * cell, cell),
      rows:
        before.rows +
        grid.rows.length +
        cover(height - top - grid.rows.length * size, size),
    };
    const columns = schedule(field.columns, field.rows, Math.random);
    return {
      grid,
      field,
      columns,
      end: rainEnd(columns, field.rows),
      canvas,
      ctx,
      colors: { face: colorOf("face"), side: colorOf("side"), "": colorOf("") },
    };
  }

  // Sets the canvas in the art's font and finds where the art sits on it.
  #layout(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): Layout {
    const box = canvas.getBoundingClientRect();
    const art = this.#pre.getBoundingClientRect();
    const style = window.getComputedStyle(this.#pre);
    const size = Number.parseFloat(style.fontSize);
    ctx.font = `${size}px ${style.fontFamily}`;
    const {
      width: cell,
      fontBoundingBoxAscent: ascent,
      fontBoundingBoxDescent: descent,
    } = ctx.measureText("M");
    return {
      width: box.width,
      height: box.height,
      left: art.left - box.left,
      top: art.top - box.top,
      cell,
      size,
      // Each line is one font size tall, with its baseline placed as CSS
      // places it.
      baseline: (size - ascent - descent) / 2 + ascent,
    };
  }

  #run(scene: Scene, end: () => void): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      let request = 0;
      const finish = () => {
        cancelAnimationFrame(request);
        end();
        resolve();
      };
      this.#stop = finish;
      const tick = (now: number) => {
        // Rendering the art afresh, for a new width, ends the rain.
        if (this.#display.grid !== scene.grid) return finish();
        this.#draw(scene, now - start);
        if (now - start >= scene.end) finish();
        else request = requestAnimationFrame(tick);
      };
      tick(start);
    });
  }

  #draw({ grid, field, columns, canvas, ctx, colors }: Scene, time: number) {
    // The rows of the field each writer's trail has passed, which keep their
    // art.
    const written = columns.map(({ writer }) => writtenRows(writer, time));
    this.#display.reveal(
      written
        .slice(field.left, field.left + grid.columns)
        .map((rows) => rows - field.top),
    );

    const box = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const [width, height] = [box.width * ratio, box.height * ratio].map(
      Math.round,
    );
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);

    // The canvas draws on the art's own grid, in its font, and the field
    // follows the art should it move.
    const layout = this.#layout(canvas, ctx);
    const { cell, size } = layout;
    const left = layout.left - field.left * cell;
    const top = layout.top + layout.baseline - field.top * size;
    const last = field.rows - 1;
    const charAt = (row: number, column: number) =>
      grid.rows[row - field.top]?.[column - field.left] ?? " ";

    // Characters the writers have passed, cooling from white to their shade.
    ctx.textAlign = "left";
    const [right, bottom] = [
      field.left + grid.columns - 1,
      field.top + grid.rows.length - 1,
    ];
    for (let column = field.left; column <= right; column++) {
      const { writer } = columns[column];
      const head = Math.min(Math.floor(headOf(writer, time)), bottom);
      for (let row = Math.max(written[column], field.top); row <= head; row++) {
        const char = charAt(row, column);
        if (char === " ") continue;
        const [x, y] = [left + column * cell, top + row * size];
        ctx.globalAlpha = 1;
        ctx.fillStyle =
          colors[grid.layers[row - field.top][column - field.left]];
        ctx.fillText(char, x, y);
        ctx.globalAlpha = glowOf(writer, row, time);
        ctx.fillStyle = "#fff";
        ctx.fillText(char, x, y);
      }
    }

    // The code, mirrored as in the film, each glyph flipped in its own cell.
    ctx.setTransform(-ratio, 0, 0, ratio, box.width * ratio, 0);
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    const code = (column: number, row: number, glow: number, head: number) => {
      ctx.globalAlpha = row === head ? 1 : TRAIL * glow;
      ctx.fillText(
        codeAt(column, row, time),
        box.width - left - (column + 0.5) * cell,
        top + row * size,
      );
    };
    columns.forEach(({ writer, rain }, column) => {
      const head = Math.floor(headOf(writer, time));
      // The writer trails code wherever the art is blank.
      for (let row = written[column]; row <= Math.min(head, last); row++) {
        if (charAt(row, column) === " ") {
          code(column, row, glowOf(writer, row, time), head);
        }
      }
      // The rain falls below the writer's head.
      for (const drop of rain) {
        const at = headOf(drop, time);
        const first = Math.max(Math.ceil(at - drop.trail), head + 1, 0);
        for (let row = first; row <= Math.min(Math.floor(at), last); row++) {
          const glow = glowOf(drop, row, time);
          if (glow > 0) code(column, row, glow, Math.floor(at));
        }
      }
    });
    ctx.globalAlpha = 1;
  }
}
