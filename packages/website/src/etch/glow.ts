// Draws the laser on the glow canvas: a white-hot point in an orange halo,
// and the line the raster pass is burning.

export const drawHead = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
) => {
  const flicker = radius * (0.85 + Math.random() * 0.3);
  const halo = ctx.createRadialGradient(x, y, 0, x, y, flicker);
  halo.addColorStop(0, "rgba(255, 255, 255, 1)");
  halo.addColorStop(0.18, "rgba(255, 226, 170, 0.95)");
  halo.addColorStop(0.45, "rgba(255, 128, 48, 0.4)");
  halo.addColorStop(1, "rgba(255, 80, 16, 0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(x, y, flicker, 0, Math.PI * 2);
  ctx.fill();
};

export const drawScanline = (
  ctx: CanvasRenderingContext2D,
  y: number,
  width: number,
  thickness: number,
) => {
  const band = ctx.createLinearGradient(0, y - thickness, 0, y + thickness);
  band.addColorStop(0, "rgba(255, 96, 24, 0)");
  band.addColorStop(0.5, "rgba(255, 180, 110, 0.55)");
  band.addColorStop(1, "rgba(255, 96, 24, 0)");
  ctx.fillStyle = band;
  ctx.fillRect(0, y - thickness, width, thickness * 2);
};
