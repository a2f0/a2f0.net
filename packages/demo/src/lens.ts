// The lens is the circle, in stage coordinates, through which the view
// underneath shows. Its radius animates; its centre tracks the pointer.

export interface Point {
  x: number;
  y: number;
}

// A quarter is 24.26 mm across, about 92 CSS pixels.
const LENS_RADIUS = 46;
const PEEK: KeyframeAnimationOptions = { duration: 180, easing: "ease-out" };
const FLOOD: KeyframeAnimationOptions = {
  duration: 450,
  easing: "cubic-bezier(0.65, 0, 0.35, 1)",
};

/** Distance from a point to the farthest corner of a box. */
export const reach = ({ x, y }: Point, width: number, height: number) =>
  Math.hypot(Math.max(x, width - x), Math.max(y, height - y));

export class Lens {
  readonly #stage: HTMLElement;
  readonly #reducedMotion: MediaQueryList;
  #radius = 0;
  #animation?: Animation;

  constructor(stage: HTMLElement, reducedMotion: MediaQueryList) {
    this.#stage = stage;
    this.#reducedMotion = reducedMotion;
  }

  /** The stage coordinates of a pointer event. */
  locate({ clientX, clientY }: MouseEvent): Point {
    const box = this.#stage.getBoundingClientRect();
    return { x: clientX - box.left, y: clientY - box.top };
  }

  aim({ x, y }: Point) {
    this.#stage.style.setProperty("--x", `${x}px`);
    this.#stage.style.setProperty("--y", `${y}px`);
  }

  /** Sets the radius at once, cancelling any animation. */
  snap(radius: number) {
    this.#animation?.cancel();
    this.#animation = undefined;
    this.#radius = radius;
    this.#stage.style.setProperty("--lens", `${radius}px`);
  }

  /** Opens the lens to peek at the view underneath, or closes it. */
  peek(open: boolean) {
    return this.#resize(open ? LENS_RADIUS : 0, PEEK);
  }

  /** Widens the lens from a point until the view underneath fills the stage. */
  flood(origin: Point) {
    const { width, height } = this.#stage.getBoundingClientRect();
    this.aim(origin);
    return this.#resize(reach(origin, width, height), FLOOD);
  }

  // Resolves false when a later change interrupts the animation.
  async #resize(
    radius: number,
    timing: KeyframeAnimationOptions,
  ): Promise<boolean> {
    if (radius === this.#radius) return true;
    if (this.#reducedMotion.matches) {
      this.snap(radius);
      return true;
    }
    const from = window
      .getComputedStyle(this.#stage)
      .getPropertyValue("--lens");
    this.snap(radius);
    this.#animation = this.#stage.animate(
      { "--lens": [from, `${radius}px`] },
      timing,
    );
    return this.#animation.finished.then(
      () => true,
      () => false,
    );
  }
}
