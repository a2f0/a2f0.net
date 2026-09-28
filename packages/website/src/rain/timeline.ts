// When the code falls in each column of the ASCII art. A few drops of code
// rain fall first, then a last drop, the writer, leaves the column's art
// behind it as its trail cools.

/** By when every column has been written, in ms. */
export const RAIN_MS = 8000;
// When writers set off, in ms, so the rain trickles in first.
const WRITE_FROM = 1200;
const WRITE_TO = 5000;
// How long a drop takes to fall the height of the art, in ms.
const FALL_MIN = 1000;
const FALL_MAX = 2800;
// How long a drop's trail is, as a share of the art's height.
const TRAIL_MIN = 0.25;
const TRAIL_MAX = 0.6;
// How many drops of rain fall before a column's writer.
const DROPS_MAX = 3;

export interface Drop {
  /** When the head enters the top row, in ms. */
  start: number;
  /** How many rows the head falls each ms. */
  speed: number;
  /** How many rows the trail stretches behind the head. */
  trail: number;
}

export interface Column {
  /** Drops of code that fall ahead of the writer. */
  rain: Drop[];
  /** The last drop, which leaves the art behind. */
  writer: Drop;
}

/** The row under a drop's head at a moment; negative before it enters. */
export const headOf = ({ start, speed }: Drop, time: number) =>
  (time - start) * speed;

/** How brightly a drop lights a row: 1 at its head, fading along its trail. */
export const glowOf = (drop: Drop, row: number, time: number) => {
  const behind = headOf(drop, time) - row;
  return behind >= 0 && behind < drop.trail ? 1 - behind / drop.trail : 0;
};

/** How many rows, from the top, a writer's trail has passed and left cool. */
export const writtenRows = (writer: Drop, time: number) =>
  Math.max(Math.floor(headOf(writer, time) - writer.trail) + 1, 0);

/** When the last writer's trail leaves the bottom of the art, in ms. */
export const rainEnd = (columns: readonly Column[], rows: number) =>
  Math.max(
    0,
    ...columns.map(
      ({ writer }) => writer.start + (rows + writer.trail) / writer.speed,
    ),
  );

/**
 * Plans each column's drops.
 * @param random A source of numbers in [0, 1).
 */
export const schedule = (
  columns: number,
  rows: number,
  random: () => number,
): Column[] => {
  const between = (low: number, high: number) => low + random() * (high - low);
  const trail = () =>
    Math.max(Math.round(rows * between(TRAIL_MIN, TRAIL_MAX)), 3);
  return Array.from({ length: columns }, () => {
    const start = between(WRITE_FROM, WRITE_TO);
    const writerTrail = trail();
    // The writer falls fast enough to finish by the end.
    const fall = Math.min(between(FALL_MIN, FALL_MAX), RAIN_MS - start);
    const writer = {
      start,
      speed: (rows + writerTrail) / fall,
      trail: writerTrail,
    };
    const rain = Array.from(
      { length: 1 + Math.floor(random() * DROPS_MAX) },
      () => ({
        start: between(0, start),
        speed: rows / between(FALL_MIN, FALL_MAX),
        trail: trail(),
      }),
    );
    return { rain, writer };
  });
};
