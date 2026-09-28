// Plays the etching over the stage: a visible laser beam traces every
// stroke of the artwork in painting order, each glowing hot then cooling,
// and a raster sweep then reveals the finished artwork line by line.

import { fetchArtwork } from "../artwork";
import {
  drawBeam,
  drawScanline,
  drawSpot,
  emitterFor,
  type Point,
} from "./glow";
import { strokeLayer, traceable } from "./strokes";
import { type EtchFrame, etchFrame, sweep } from "./timeline";

interface Scene {
  lines: SVGSVGElement;
  strokes: SVGGeometryElement[];
  lengths: number[];
  /** The dash offset last set on each stroke, to skip unchanged ones. */
  offsets: number[];
  glow: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export class Etcher {
  readonly #stage: HTMLElement;
  readonly #art: HTMLElement;
  #artwork?: Promise<Document>;
  #stop?: () => void;

  /**
   * @param stage The element the etching plays over.
   * @param art The finished artwork, revealed by the raster pass.
   */
  constructor(stage: HTMLElement, art: HTMLElement) {
    this.#stage = stage;
    this.#art = art;
  }

  get playing() {
    return this.#stop !== undefined;
  }

  /** Ends the etching at once, leaving the finished artwork. */
  stop() {
    this.#stop?.();
  }

  /** Plays the etching, resolving once it finishes or is stopped. */
  async play(): Promise<void> {
    if (this.playing) return;
    // Stopping settles play() at once, even while the artwork is loading.
    const stopped = new Promise<undefined>((resolve) => {
      this.#stop = () => resolve(undefined);
    });
    try {
      this.#artwork ??= fetchArtwork().catch((error) => {
        this.#artwork = undefined;
        throw error;
      });
      const artwork = await Promise.race([this.#artwork, stopped]);
      if (!artwork) return;
      const scene = this.#build(artwork);
      try {
        await this.#run(scene);
      } finally {
        scene.lines.remove();
        scene.glow.remove();
        this.#art.style.clipPath = "";
        delete this.#stage.dataset.etching;
      }
    } finally {
      this.#stop = undefined;
    }
  }

  #build(artwork: Document): Scene {
    const lines = strokeLayer(artwork);
    lines.setAttribute("class", "etch-lines");

    const glow = document.createElement("canvas");
    glow.className = "etch-glow";
    glow.setAttribute("aria-hidden", "true");
    const ctx = glow.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");

    this.#stage.append(lines, glow);
    this.#stage.dataset.etching = "";
    const strokes = traceable(lines);
    const lengths = strokes.map((stroke) => stroke.getTotalLength());
    strokes.forEach((stroke, i) => {
      stroke.classList.add("etch-stroke");
      stroke.style.strokeDasharray = `${lengths[i]}`;
      stroke.style.strokeDashoffset = `${lengths[i]}`;
    });
    return { lines, strokes, lengths, offsets: [...lengths], glow, ctx };
  }

  #run(scene: Scene): Promise<void> {
    return new Promise((resolve) => {
      const start = performance.now();
      let request = 0;
      const finish = () => {
        cancelAnimationFrame(request);
        resolve();
      };
      this.#stop = finish;
      const tick = (now: number) => {
        const frame = etchFrame(scene.lengths, now - start);
        this.#draw(scene, frame);
        if (frame.done) finish();
        else request = requestAnimationFrame(tick);
      };
      tick(start);
    });
  }

  #draw(
    { lines, strokes, lengths, offsets, glow, ctx }: Scene,
    frame: EtchFrame,
  ) {
    strokes.forEach((stroke, i) => {
      const offset = lengths[i] - frame.traced[i];
      if (offset === offsets[i]) return;
      offsets[i] = offset;
      stroke.style.strokeDashoffset = `${offset}`;
      // A finished stroke cools from white to gray.
      if (offset === 0) stroke.classList.add("cooled");
    });
    // The raster pass replaces the traced strokes with the finished art.
    lines.style.clipPath = `inset(${frame.scan * 100}% 0 0 0)`;
    this.#art.style.clipPath = `inset(0 0 ${(1 - frame.scan) * 100}% 0)`;

    const box = glow.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    const [width, height] = [box.width * ratio, box.height * ratio].map(
      Math.round,
    );
    if (glow.width !== width || glow.height !== height) {
      glow.width = width;
      glow.height = height;
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, box.width, box.height);
    ctx.globalCompositeOperation = "lighter";
    const radius = Math.max(8, box.width / 90);

    let spot: Point | undefined;
    if (frame.active >= 0) {
      const stroke = strokes[frame.active];
      const point = stroke.getPointAtLength(frame.traced[frame.active]);
      const screen = point.matrixTransform(stroke.getScreenCTM() ?? undefined);
      spot = { x: screen.x - box.left, y: screen.y - box.top };
    } else if (frame.scan > 0 && !frame.done) {
      const art = this.#art.getBoundingClientRect();
      const y = art.top + frame.scan * art.height - box.top;
      drawScanline(ctx, y, box.width, radius / 2);
      spot = { x: art.left - box.left + sweep(frame.scan) * art.width, y };
    }
    if (spot) {
      drawBeam(
        ctx,
        emitterFor(box.width, box.height),
        spot,
        Math.max(1.5, box.width / 700),
      );
      drawSpot(ctx, spot, radius);
    }
  }
}
