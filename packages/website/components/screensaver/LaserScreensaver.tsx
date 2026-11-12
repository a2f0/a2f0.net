import { useEffect, useRef } from "react";

import { startLaserAnimation } from "./laserAnimation";

/** The site supplies grayscale artwork; the framework owns its lifetime. */
export function LaserScreensaver() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    return canvas.current ? startLaserAnimation(canvas.current) : undefined;
  }, []);

  return (
    <canvas
      ref={canvas}
      className="laser-screensaver"
      role="img"
      aria-label="Grayscale laser trails"
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        background: "black",
      }}
    />
  );
}
