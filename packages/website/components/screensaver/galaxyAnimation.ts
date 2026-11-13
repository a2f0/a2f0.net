interface Star {
  radius: number;
  angle: number;
  height: number;
  size: number;
  brightness: number;
  phase: number;
}

function createStars(): Star[] {
  return Array.from({ length: 1600 }, (_, index) => {
    const radius = Math.random() ** 0.7;
    return {
      radius,
      angle:
        (index % 4) * (Math.PI / 2) +
        radius * 7 +
        (Math.random() - 0.5) * (0.35 + radius * 0.8),
      height: (Math.random() - 0.5) * (1 - radius) * 0.16,
      size: 0.4 + Math.random() ** 3 * 1.7,
      brightness: 0.25 + Math.random() * 0.75,
      phase: Math.random() * Math.PI * 2,
    };
  });
}

/** A slowly turning spiral galaxy, kept local to the website. */
export function startGalaxyAnimation(canvas: HTMLCanvasElement): () => void {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;
  const stars = createStars();
  const background = Array.from({ length: 180 }, () => ({
    x: Math.random(),
    y: Math.random(),
    brightness: 0.15 + Math.random() * 0.4,
    size: 0.4 + Math.random() * 0.8,
  }));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let resolution: MediaQueryList;
  let width = 0;
  let height = 0;
  let radius = 0;
  let glow: CanvasGradient;
  let frame: number | null = null;
  let previous: number | null = null;
  let elapsed = 0;
  let disposed = false;

  const draw = () => {
    context.fillStyle = "#000000";
    context.fillRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    for (const star of background) {
      context.globalAlpha = star.brightness;
      context.fillRect(star.x * width, star.y * height, star.size, star.size);
    }
    context.globalAlpha = 1;
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate(-0.35);
    context.scale(1, 0.62);
    context.fillStyle = glow;
    context.fillRect(-radius, -radius, radius * 2, radius * 2);
    context.fillStyle = "#ffffff";
    for (const star of stars) {
      const angle = star.angle + elapsed * 0.025;
      const x = Math.cos(angle) * star.radius * radius;
      const y = (Math.sin(angle) * star.radius + star.height) * radius;
      context.globalAlpha =
        star.brightness * (0.8 + 0.2 * Math.sin(star.phase + elapsed * 0.7));
      context.beginPath();
      context.arc(x, y, star.size, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    context.globalAlpha = 1;
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    radius = Math.max(1, Math.min(width * 0.48, height * 0.7));
    glow = context.createRadialGradient(0, 0, 0, 0, 0, radius);
    glow.addColorStop(0, "rgba(255, 255, 255, 0.65)");
    glow.addColorStop(0.08, "rgba(220, 220, 220, 0.25)");
    glow.addColorStop(0.35, "rgba(160, 160, 160, 0.08)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    draw();
  };
  const animate = (timestamp: number) => {
    if (disposed) return;
    if (previous !== null) elapsed += Math.min(timestamp - previous, 50) / 1000;
    previous = timestamp;
    draw();
    frame = window.requestAnimationFrame(animate);
  };
  const restart = () => {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    previous = null;
    if (!reducedMotion.matches) frame = window.requestAnimationFrame(animate);
  };
  const watchResolution = () => {
    resolution?.removeEventListener("change", onResolutionChange);
    resolution = window.matchMedia(
      `(resolution: ${window.devicePixelRatio || 1}dppx)`,
    );
    resolution.addEventListener("change", onResolutionChange);
  };
  const onResolutionChange = () => {
    resize();
    watchResolution();
  };

  resize();
  restart();
  watchResolution();
  window.addEventListener("resize", resize);
  reducedMotion.addEventListener("change", restart);
  return () => {
    disposed = true;
    if (frame !== null) window.cancelAnimationFrame(frame);
    window.removeEventListener("resize", resize);
    reducedMotion.removeEventListener("change", restart);
    resolution.removeEventListener("change", onResolutionChange);
  };
}
