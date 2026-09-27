// Renders a2f0.svg as ASCII art. The letter faces and their extrusion are
// isolated from the SVG so each layer can be shaded on its own, then every
// character cell is matched against the shapes of the page's monospace glyphs.

const SVG_URL = "/a2f0.svg";
const FACES = 'use[href="#word"]:not([transform])';
const LETTERS = 'use[href="#word"]';
const CHARSET = " .,:;'`\"^_-~=+*<>/\\|()[]{}!?1ilIjtfrLJ7Y0O8#%&$@";
const SIDE_CHAR = "\\";
const GLYPH_SIZE = 48;
const CELL_WIDTH = 12;
const INK = 0.1;
const FLOOR = 0.05;
const CONTRAST = 1.6;

// Six staggered sampling circles, in cell-relative coordinates, describe
// where a cell's ink sits.
const CIRCLES = [
  [0.3, 0.2],
  [0.7, 0.16],
  [0.28, 0.5],
  [0.72, 0.46],
  [0.3, 0.82],
  [0.7, 0.78],
];
// Matching circles just outside the cell sharpen edges against neighbours.
const EXTERNAL = [
  [0.1, -0.15],
  [0.9, -0.2],
  [-0.2, 0.5],
  [1.2, 0.46],
  [0.1, 1.15],
  [0.9, 1.1],
];
const CIRCLE_RADIUS = 0.24;

const mix = (from, to, amount) => from + (to - from) * amount;

const circleOffsets = (centers, width, height) =>
  centers.map(([cx, cy]) => {
    const offsets = [];
    const radius = CIRCLE_RADIUS * width;
    for (let y = Math.floor(-height / 2); y < height * 1.5; y++) {
      for (let x = Math.floor(-width / 2); x < width * 1.5; x++) {
        const dx = x + 0.5 - cx * width;
        const dy = y + 0.5 - cy * height;
        if (dx * dx + dy * dy <= radius * radius) offsets.push([x, y]);
      }
    }
    return offsets;
  });

const glyphShapes = (fontFamily) => {
  const font = `${GLYPH_SIZE}px ${fontFamily}`;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.font = font;
  const metrics = ctx.measureText("M");
  const ratio = metrics.width / GLYPH_SIZE;
  const width = Math.round(GLYPH_SIZE * ratio);
  const height = GLYPH_SIZE;
  const baseline =
    (height - metrics.fontBoundingBoxAscent - metrics.fontBoundingBoxDescent) /
      2 +
    metrics.fontBoundingBoxAscent;
  canvas.width = width;
  canvas.height = height;
  const offsets = circleOffsets(CIRCLES, width, height);

  const vectors = [...CHARSET].map((char) => {
    ctx.clearRect(0, 0, width, height);
    ctx.font = font;
    ctx.fillStyle = "#fff";
    ctx.fillText(char, 0, baseline);
    const { data } = ctx.getImageData(0, 0, width, height);
    return offsets.map((circle) => {
      let sum = 0;
      for (const [x, y] of circle) {
        if (x >= 0 && y >= 0 && x < width && y < height) {
          sum += data[(y * width + x) * 4 + 3];
        }
      }
      return sum / (circle.length * 255);
    });
  });

  const peak = Math.max(...vectors.flat());
  return {
    ratio,
    vectors: vectors.map((vector) => vector.map((value) => value / peak)),
  };
};

// Copies the artwork, keeping only the matching elements painted solid white.
const isolate = (svg, selector) => {
  const copy = svg.cloneNode(true);
  const root = copy.documentElement;
  const keep = new Set();
  for (const node of root.querySelectorAll(selector)) {
    node.setAttribute("fill", "#fff");
    node.setAttribute("stroke", "none");
    for (let n = node; n !== root; n = n.parentNode) keep.add(n);
  }
  const prune = (parent) => {
    for (const child of [...parent.children]) {
      if (child.localName === "defs") continue;
      if (!keep.has(child)) child.remove();
      else if (!child.matches(selector)) prune(child);
    }
  };
  prune(root);
  return copy;
};

const luminance = async (svg, width, height) => {
  // Firefox only rasterizes SVG images that declare an intrinsic size.
  svg.documentElement.setAttribute("width", width);
  svg.documentElement.setAttribute("height", height);
  const blob = new Blob([new XMLSerializer().serializeToString(svg)], {
    type: "image/svg+xml",
  });
  const url = URL.createObjectURL(blob);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    const values = new Float32Array(width * height);
    for (let i = 0; i < values.length; i++) {
      values[i] =
        (0.2126 * data[i * 4] +
          0.7152 * data[i * 4 + 1] +
          0.0722 * data[i * 4 + 2]) /
        255;
    }
    return values;
  } finally {
    URL.revokeObjectURL(url);
  }
};

const loadArtwork = async () => {
  const response = await fetch(SVG_URL);
  if (!response.ok) throw new Error(`Failed to load ${SVG_URL}`);
  const svg = new DOMParser().parseFromString(
    await response.text(),
    "image/svg+xml",
  );
  const [, , width, height] = svg.documentElement
    .getAttribute("viewBox")
    .split(/[\s,]+/)
    .map(Number);
  const { fontFamily } = window.getComputedStyle(ascii);
  return { svg, aspect: height / width, glyphs: glyphShapes(fontFamily) };
};

const nearest = (vector, glyphs) => {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let g = 0; g < glyphs.length; g++) {
    let distance = 0;
    for (let i = 0; i < vector.length; i++) {
      const delta = vector[i] - glyphs[g][i];
      distance += delta * delta;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      best = g;
    }
  }
  return CHARSET[best];
};

const sharpen = (value, peak) =>
  peak > 0 ? (value / peak) ** CONTRAST * peak : 0;

let artwork;
const renderAscii = async (columns) => {
  artwork ??= loadArtwork().catch((error) => {
    artwork = undefined;
    throw error;
  });
  const { svg, aspect, glyphs } = await artwork;
  const cellHeight = Math.round(CELL_WIDTH / glyphs.ratio);
  const rows = Math.round(columns * aspect * glyphs.ratio);
  const width = columns * CELL_WIDTH;
  const height = rows * cellHeight;
  const [art, faces, letters] = await Promise.all([
    luminance(svg.cloneNode(true), width, height),
    luminance(isolate(svg, FACES), width, height),
    luminance(isolate(svg, LETTERS), width, height),
  ]);

  // Faces read as bright chrome, the extrusion as dim metal, and the
  // surrounding brushwork as a faint backdrop; true ink stays black.
  const tone = new Float32Array(width * height);
  for (let i = 0; i < tone.length; i++) {
    const face = faces[i];
    const side = Math.max(letters[i] - face, 0);
    const lit = art[i] < INK ? 0 : 1;
    tone[i] =
      face * lit * mix(0.5, 1, art[i]) +
      side * lit * mix(0.04, 0.4, art[i]) +
      (1 - face - side) * 0.4 * art[i];
  }

  const coverage = (mask, left, top) => {
    let sum = 0;
    for (let y = top; y < top + cellHeight; y++) {
      for (let x = left; x < left + CELL_WIDTH; x++) sum += mask[y * width + x];
    }
    return sum / (CELL_WIDTH * cellHeight);
  };
  const sample = (circles, left, top) =>
    circles.map((circle) => {
      let sum = 0;
      for (const [dx, dy] of circle) {
        const x = Math.min(Math.max(left + dx, 0), width - 1);
        const y = Math.min(Math.max(top + dy, 0), height - 1);
        sum += tone[y * width + x];
      }
      return sum / circle.length;
    });

  const internal = circleOffsets(CIRCLES, CELL_WIDTH, cellHeight);
  const external = circleOffsets(EXTERNAL, CELL_WIDTH, cellHeight);
  const lines = [];
  for (let row = 0; row < rows; row++) {
    const runs = [];
    for (let column = 0; column < columns; column++) {
      const left = column * CELL_WIDTH;
      const top = row * cellHeight;
      const face = coverage(faces, left, top);
      const side = Math.max(coverage(letters, left, top) - face, 0);
      const layer =
        face >= side && face > 0.25 ? "face" : side > 0.25 ? "side" : "";
      const vector = sample(internal, left, top);
      let char;
      if (Math.max(...vector) < FLOOR) {
        char = " ";
      } else if (side > 0.9 && face < 0.02) {
        char = SIDE_CHAR;
      } else if (layer) {
        // Letter edges get crisper glyphs; the backdrop keeps soft shading.
        const outside = sample(external, left, top);
        const edged = vector.map((value, i) =>
          sharpen(value, Math.max(value, outside[i])),
        );
        const peak = Math.max(...edged);
        char = nearest(
          edged.map((value) => sharpen(value, peak)),
          glyphs.vectors,
        );
      } else {
        char = nearest(vector, glyphs.vectors);
      }
      const last = runs.at(-1);
      if (last?.layer === layer) last.text += char;
      else runs.push({ layer, text: char });
    }
    lines.push(runs);
  }
  return { ratio: glyphs.ratio, lines };
};

const main = document.querySelector("main");
const graffiti = document.querySelector(".graffiti");
const ascii = document.querySelector(".ascii");
const toggle = document.querySelector(".view-toggle");

const columnsFor = (width) =>
  Math.round(Math.min(Math.max(width / 7, 96), 200));

let columns = 0;
let drawing = Promise.resolve();
const draw = () => {
  const next = columnsFor(main.clientWidth);
  if (next === columns) return drawing;
  columns = next;
  drawing = renderAscii(next).then(
    ({ ratio, lines }) => {
      if (next !== columns) return;
      ascii.style.setProperty("--columns", next);
      ascii.style.setProperty("--ratio", ratio);
      ascii.replaceChildren(
        ...lines.flatMap((runs) => [
          ...runs.map(({ layer, text }) => {
            if (!layer) return text;
            const span = document.createElement("span");
            span.className = layer;
            span.textContent = text;
            return span;
          }),
          "\n",
        ]),
      );
    },
    (error) => {
      columns = 0;
      throw error;
    },
  );
  return drawing;
};

const show = async (asAscii) => {
  toggle.setAttribute("aria-pressed", String(asAscii));
  window.history.replaceState(
    null,
    "",
    asAscii ? "#ascii" : window.location.pathname + window.location.search,
  );
  try {
    if (asAscii) await draw();
  } catch (error) {
    console.error(error);
    return show(false);
  }
  // A later click wins over a render that was still in flight.
  if (toggle.getAttribute("aria-pressed") !== String(asAscii)) return;
  graffiti.hidden = asAscii;
  ascii.hidden = !asAscii;
};

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (!ascii.hidden) draw().catch(console.error);
  }, 200);
});
toggle.addEventListener("click", () =>
  show(toggle.getAttribute("aria-pressed") !== "true"),
);
toggle.hidden = false;
if (window.location.hash === "#ascii") show(true);
