// Plays the code rain over the ASCII view. Drops of mirrored code fall down
// each column of the art, white at the head and fading behind it. The last
// drop in each column writes the art: the characters it passes stay, cooling
// from white to their own shade, while the code around them fades away.

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

interface Scene {
  grid: Grid;
  columns: Column[];
  end: number;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  /** The color each layer of the art settles to. */
  colors: Record<Layer, string>;
}

export class Rain {
  readonly #stage: HTMLElement;
  readonly #pre: HTMLElement;
  readonly #display: AsciiDisplay;
  #stop?: () => void;

  /**
   * @param stage The element the rain plays over.
   * @param pre The ASCII art, which the rain writes.
   * @param display What renders the art into the pre.
   */
  constructor(stage: HTMLElement, pre: HTMLElement, display: AsciiDisplay) {
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
    const columns = schedule(grid.columns, grid.rows.length, Math.random);
    this.#stage.append(canvas);
    this.#stage.dataset.raining = "";
    return {
      grid,
      columns,
      end: rainEnd(columns, grid.rows.length),
      canvas,
      ctx,
      colors: { face: colorOf("face"), side: colorOf("side"), "": colorOf("") },
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

  #draw({ grid, columns, canvas, ctx, colors }: Scene, time: number) {
    const depths = columns.map(({ writer }) => writtenRows(writer, time));
    this.#display.reveal(depths);

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

    // The canvas draws on the art's own grid, in its font: each line is one
    // font size tall, with its baseline placed as CSS places it.
    const art = this.#pre.getBoundingClientRect();
    const style = window.getComputedStyle(this.#pre);
    const size = Number.parseFloat(style.fontSize);
    ctx.font = `${size}px ${style.fontFamily}`;
    const {
      width: cell,
      fontBoundingBoxAscent: ascent,
      fontBoundingBoxDescent: descent,
    } = ctx.measureText("M");
    const left = art.left - box.left;
    const top = art.top - box.top + (size - ascent - descent) / 2 + ascent;
    const last = grid.rows.length - 1;

    // Characters the writers have passed, cooling from white to their shade.
    ctx.textAlign = "left";
    columns.forEach(({ writer }, column) => {
      const head = Math.min(Math.floor(headOf(writer, time)), last);
      for (let row = depths[column]; row <= head; row++) {
        const char = grid.rows[row][column];
        if (char === " ") continue;
        const [x, y] = [left + column * cell, top + row * size];
        ctx.globalAlpha = 1;
        ctx.fillStyle = colors[grid.layers[row][column]];
        ctx.fillText(char, x, y);
        ctx.globalAlpha = glowOf(writer, row, time);
        ctx.fillStyle = "#fff";
        ctx.fillText(char, x, y);
      }
    });

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
      const written = Math.floor(headOf(writer, time));
      // The writer trails code wherever the art is blank.
      for (let row = depths[column]; row <= Math.min(written, last); row++) {
        if (grid.rows[row][column] === " ") {
          code(column, row, glowOf(writer, row, time), written);
        }
      }
      // The rain falls below the writer's head.
      for (const drop of rain) {
        const head = headOf(drop, time);
        const first = Math.max(Math.ceil(head - drop.trail), written + 1, 0);
        for (let row = first; row <= Math.min(Math.floor(head), last); row++) {
          const glow = glowOf(drop, row, time);
          if (glow > 0) code(column, row, glow, Math.floor(head));
        }
      }
    });
    ctx.globalAlpha = 1;
  }
}
