// Draws the laser on the glow canvas, in grayscale: the beam from the
// emitter and the white-hot spot where it strikes, or the fat laser's fan
// of light and the line it burns.

export interface Point {
  x: number;
  y: number;
}

/**
 * Where the beam comes from: above the middle of the canvas, as a marking
 * laser's steering mirrors sit above the work.
 */
export const emitterFor = (width: number, height: number): Point => ({
  x: width / 2,
  y: -height * 0.3,
});

// Randomly dims a brightness a little, so the laser shimmers.
const flicker = (value: number) => value * (0.85 + Math.random() * 0.15);

export const drawBeam = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  width: number,
) => {
  // The beam fades in from the canvas's top edge, since the emitter sits
  // above it, and scattered light makes it brightest where it strikes.
  const edge =
    to.y > from.y ? Math.min(Math.max(-from.y / (to.y - from.y), 0), 1) : 0;
  const fade = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
  fade.addColorStop(0, "rgba(255, 255, 255, 0)");
  fade.addColorStop(edge, "rgba(255, 255, 255, 0)");
  fade.addColorStop(1, "rgba(255, 255, 255, 0.9)");
  ctx.strokeStyle = fade;
  ctx.lineCap = "round";
  // A thin core inside a soft halo.
  for (const [scale, alpha] of [
    [4, 0.12],
    [1.6, 0.3],
    [0.5, 1],
  ]) {
    ctx.globalAlpha = flicker(alpha);
    ctx.lineWidth = width * scale;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

export const drawSpot = (
  ctx: CanvasRenderingContext2D,
  { x, y }: Point,
  radius: number,
) => {
  const size = flicker(radius);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, size);
  halo.addColorStop(0, "rgba(255, 255, 255, 1)");
  halo.addColorStop(0.2, "rgba(255, 255, 255, 0.9)");
  halo.addColorStop(0.5, "rgba(200, 200, 200, 0.35)");
  halo.addColorStop(1, "rgba(160, 160, 160, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // A faint cross of flare lines sells how bright the spot is.
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - size * 2.5, y);
  ctx.lineTo(x + size * 2.5, y);
  ctx.moveTo(x, y - size * 1.5);
  ctx.lineTo(x, y + size * 1.5);
  ctx.stroke();
};

/**
 * The fat laser: a line burned across the surface, fed by a fan of light
 * from the emitter, like a flashlight beam seen from the side. Unlike the
 * small spot, it holds a steady brightness: across an area this large, a
 * shimmer reads as flicker.
 */
export const drawFatBeam = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  a: Point,
  b: Point,
  width: number,
) => {
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  const edge =
    middle.y > from.y
      ? Math.min(Math.max(-from.y / (middle.y - from.y), 0), 1)
      : 0;
  const fan = ctx.createLinearGradient(from.x, from.y, middle.x, middle.y);
  fan.addColorStop(0, "rgba(255, 255, 255, 0)");
  fan.addColorStop(edge, "rgba(255, 255, 255, 0)");
  fan.addColorStop(1, "rgba(255, 255, 255, 0.28)");
  ctx.fillStyle = fan;
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.closePath();
  ctx.fill();

  // The burning line: a white core inside a soft halo.
  ctx.lineCap = "round";
  for (const [scale, alpha] of [
    [5, 0.15],
    [2, 0.4],
    [0.6, 1],
  ]) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "rgba(255, 255, 255, 1)";
    ctx.lineWidth = width * scale;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};
