import { useEffect, useRef } from "react";

import { startGalaxyAnimation } from "./galaxyAnimation";

export function GalaxyScreensaver() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    return canvas.current ? startGalaxyAnimation(canvas.current) : undefined;
  }, []);

  return (
    <canvas
      ref={canvas}
      className="galaxy-screensaver"
      role="img"
      aria-label="Grayscale spiral galaxy"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        background: "black",
      }}
    />
  );
}
