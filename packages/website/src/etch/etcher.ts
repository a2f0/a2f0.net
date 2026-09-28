// Plays the etching over the stage. A laser beam first traces every stroke
// of the artwork, the lettering first, each glowing hot and then cooling.
// Then a fat laser, a burning line fed by a fan of light, fills in each unit
// of the artwork with its real paint, and the unit's etched lines fade.

import { fetchArtwork } from "../artwork";
import { type FillUnit, fillLayer, fillUnits } from "./fills";
import {
  drawBeam,
  drawFatBeam,
  drawSpot,
  emitterFor,
  type Point,
} from "./glow";
import {
  letterSilhouette,
  lettersFirst,
  mostlyWithin,
  outlinePoints,
} from "./order";
import { GEOMETRY, strokeLayer, traceable } from "./strokes";
import { type EtchFrame, etchFrame } from "./timeline";
import { unitOf } from "./units";

// The shortest sweep a unit gets, in the artwork's units, so small pieces
// are still seen being filled.
const MIN_SWEEP = 24;

interface Prepared {
  svg: Document;
  onLetters: (point: Point) => boolean;
}

interface Trace {
  shape: SVGGeometryElement;
  length: number;
  unit: number;
  letter: boolean;
  /** The dash offset last set, to skip unchanged strokes. */
  offset: number;
}

interface Fill extends FillUnit {
  letter: boolean;
  /** The filled fraction last shown, to skip unchanged units. */
  shown: number;
}

interface Scene {
  layers: Element[];
  traces: Trace[];
  fills: Fill[];
  glow: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export class Etcher {
  readonly #stage: HTMLElement;
  readonly #art: HTMLElement;
  #prepared?: Promise<Prepared>;
  #stop?: () => void;

  /**
   * @param stage The element the etching plays over.
   * @param art The finished artwork, hidden until the etching ends.
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
      this.#prepared ??= fetchArtwork()
        .then(async (svg) => ({ svg, onLetters: await letterSilhouette(svg) }))
        .catch((error) => {
          this.#prepared = undefined;
          throw error;
        });
      const prepared = await Promise.race([this.#prepared, stopped]);
      if (!prepared) return;
      const scene = this.#build(prepared);
      try {
        await this.#run(scene);
      } finally {
        for (const layer of scene.layers) layer.remove();
        this.#art.style.visibility = "";
        delete this.#stage.dataset.etching;
      }
    } finally {
      this.#stop = undefined;
    }
  }

  #build({ svg, onLetters }: Prepared): Scene {
    const lines = strokeLayer(svg);
    lines.setAttribute("class", "etch-lines");
    const paint = fillLayer(svg);
    paint.setAttribute("class", "etch-fills");
    const glow = document.createElement("canvas");
    glow.className = "etch-glow";
    glow.setAttribute("aria-hidden", "true");
    const ctx = glow.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is unavailable");

    this.#stage.append(paint, lines, glow);
    this.#stage.dataset.etching = "";
    this.#art.style.visibility = "hidden";

    // A unit belongs to the lettering when its shapes, stroked or not, lie
    // mostly on the letters.
    const samples = new Map<number, Point[]>();
    for (const shape of lines.querySelectorAll<SVGGeometryElement>(GEOMETRY)) {
      if (shape.closest("defs")) continue;
      const unit = unitOf(shape);
      samples.set(unit, [
        ...(samples.get(unit) ?? []),
        ...outlinePoints(lines, shape, 4),
      ]);
    }
    const letterUnits = new Set(
      [...samples]
        .filter(([, points]) => mostlyWithin(points, onLetters))
        .map(([unit]) => unit),
    );

    const traces = lettersFirst(
      traceable(lines).map((shape) => {
        const length = shape.getTotalLength();
        return {
          shape,
          length,
          unit: unitOf(shape),
          letter: mostlyWithin(outlinePoints(lines, shape, 12), onLetters),
          offset: length,
        };
      }),
    );
    for (const { shape, length, letter } of traces) {
      shape.classList.add("etch-stroke");
      if (letter) shape.dataset.letter = "";
      shape.style.strokeDasharray = `${length}`;
      shape.style.strokeDashoffset = `${length}`;
    }

    const fills = lettersFirst(
      fillUnits(paint).map((unit) => ({
        ...unit,
        letter: letterUnits.has(unit.unit),
        shown: 0,
      })),
    );
    for (const { group, letter } of fills) {
      if (letter) group.dataset.letter = "";
    }
    return { layers: [paint, lines, glow], traces, fills, glow, ctx };
  }

  #run(scene: Scene): Promise<void> {
    const lengths = scene.traces.map(({ length }) => length);
    const sweeps = scene.fills.map(({ box }) =>
      Math.max(box.height, MIN_SWEEP),
    );
    return new Promise((resolve) => {
      const start = performance.now();
      let request = 0;
      const finish = () => {
        cancelAnimationFrame(request);
        resolve();
      };
      this.#stop = finish;
      const tick = (now: number) => {
        const frame = etchFrame(lengths, sweeps, now - start);
        this.#draw(scene, frame);
        if (frame.done) finish();
        else request = requestAnimationFrame(tick);
      };
      tick(start);
    });
  }

  #draw({ traces, fills, glow, ctx }: Scene, frame: EtchFrame) {
    traces.forEach((trace, i) => {
      const offset = trace.length - frame.traced[i];
      if (offset === trace.offset) return;
      trace.offset = offset;
      trace.shape.style.strokeDashoffset = `${offset}`;
      // A finished stroke cools from white to gray.
      if (offset === 0) trace.shape.classList.add("cooled");
    });
    fills.forEach((fill, i) => {
      const filled = frame.filled[i];
      if (filled === fill.shown) return;
      fill.shown = filled;
      fill.reveal.setAttribute("height", `${filled * fill.box.height}`);
      // Once a unit is painted, its etched lines give way to the paint.
      if (filled === 1) {
        for (const trace of traces) {
          if (trace.unit === fill.unit) trace.shape.classList.add("filled");
        }
      }
    });

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
    const emitter = emitterFor(box.width, box.height);
    const beam = Math.max(1.5, box.width / 700);
    // Maps a point from an element's coordinates onto the canvas.
    const onCanvas = (element: SVGGraphicsElement, x: number, y: number) => {
      const point = new DOMPoint(x, y).matrixTransform(
        element.getScreenCTM() ?? undefined,
      );
      return { x: point.x - box.left, y: point.y - box.top };
    };

    if (frame.active >= 0) {
      const { shape } = traces[frame.active];
      const { x, y } = shape.getPointAtLength(frame.traced[frame.active]);
      const spot = onCanvas(shape, x, y);
      drawBeam(ctx, emitter, spot, beam);
      drawSpot(ctx, spot, Math.max(8, box.width / 90));
    } else if (frame.filling >= 0) {
      const { group, box: unit } = fills[frame.filling];
      const y = unit.y + frame.filled[frame.filling] * unit.height;
      drawFatBeam(
        ctx,
        emitter,
        onCanvas(group, unit.x, y),
        onCanvas(group, unit.x + unit.width, y),
        beam,
      );
    }
  }
}
