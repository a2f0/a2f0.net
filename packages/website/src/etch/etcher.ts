// Plays the etching over the stage: a glowing laser traces the hot letter
// outlines, then a raster sweep reveals the finished artwork line by line.

import { fetchArtwork } from "../artwork";
import { drawHead, drawScanline } from "./glow";
import { type Outlines, outlinesOf } from "./outlines";
import { type EtchFrame, etchFrame, sweep } from "./timeline";

const SVG_NS = "http://www.w3.org/2000/svg";

interface Scene {
  lines: SVGSVGElement;
  paths: SVGPathElement[];
  lengths: number[];
  glow: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export class Etcher {
  readonly #stage: HTMLElement;
  readonly #art: HTMLElement;
  #outlines?: Promise<Outlines>;
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
    let stopped = false;
    this.#stop = () => {
      stopped = true;
    };
    try {
      this.#outlines ??= fetchArtwork()
        .then(outlinesOf)
        .catch((error) => {
          this.#outlines = undefined;
          throw error;
        });
      const outlines = await this.#outlines;
      if (stopped) return;
      const scene = this.#build(outlines);
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

  #build({ viewBox, outlines }: Outlines): Scene {
    const lines = document.createElementNS(SVG_NS, "svg");
    lines.setAttribute("class", "etch-lines");
    lines.setAttribute("viewBox", viewBox);
    lines.setAttribute("aria-hidden", "true");
    const paths = outlines.map(({ d, transform }) => {
      const path = document.createElementNS(SVG_NS, "path");
      path.setAttribute("d", d);
      if (transform) path.setAttribute("transform", transform);
      return path;
    });
    lines.append(...paths);

    const glow = document.createElement("canvas");
    glow.className = "etch-glow";
    glow.setAttribute("aria-hidden", "true");
    const ctx = glow.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");

    this.#stage.append(lines, glow);
    this.#stage.dataset.etching = "";
    const lengths = paths.map((path) => path.getTotalLength());
    paths.forEach((path, i) => {
      path.style.strokeDasharray = `${lengths[i]}`;
    });
    return { lines, paths, lengths, glow, ctx };
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

  #draw({ lines, paths, lengths, glow, ctx }: Scene, frame: EtchFrame) {
    paths.forEach((path, i) => {
      path.style.strokeDashoffset = `${lengths[i] - frame.traced[i]}`;
    });
    // The hot outlines cool as the raster pass fills in the art.
    lines.style.opacity = `${1 - frame.scan}`;
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

    if (frame.active >= 0) {
      const path = paths[frame.active];
      const point = path.getPointAtLength(frame.traced[frame.active]);
      const screen = point.matrixTransform(path.getScreenCTM() ?? undefined);
      drawHead(ctx, screen.x - box.left, screen.y - box.top, radius);
    } else if (frame.scan > 0 && !frame.done) {
      const art = this.#art.getBoundingClientRect();
      const y = art.top + frame.scan * art.height - box.top;
      drawScanline(ctx, y, box.width, radius / 2);
      drawHead(
        ctx,
        art.left - box.left + sweep(frame.scan) * art.width,
        y,
        radius,
      );
    }
  }
}
