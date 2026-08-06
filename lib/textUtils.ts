import {
  layoutWithLines,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

// Canvas measurement is in pixels; the resume document is laid out in points.
const POINTS_PER_PIXEL = 0.75;

let measurementContext: CanvasRenderingContext2D | null = null;

export function getTextWidthInPoints(
  text: string,
  font = "400 12pt Helvetica",
): number {
  if (!measurementContext) {
    measurementContext = document.createElement("canvas").getContext("2d");
  }
  if (measurementContext) {
    measurementContext.font = font;
    const widthInPixels = measurementContext.measureText(text).width;
    const widthInPoints = widthInPixels * POINTS_PER_PIXEL;
    return widthInPoints;
  }
  return 0;
}

// prepare() measures every segment with canvas up front; layout afterwards is
// pure arithmetic. Cache prepared text so re-wrapping on viewport resize only
// pays the arithmetic cost.
const preparedTextCache = new Map<string, PreparedTextWithSegments>();

function getPreparedText(
  text: string,
  font: string,
): PreparedTextWithSegments {
  const key = `${font}|${text}`;
  let prepared = preparedTextCache.get(key);
  if (!prepared) {
    prepared = prepareWithSegments(text, font);
    preparedTextCache.set(key, prepared);
  }
  return prepared;
}

export function wrapLabel(
  label: string,
  maxWidth: number, // in points
  font: string, // Example: '400 12pt Helvetica'
) {
  const { plainString, matches } = extractLinks(label);
  const prepared = getPreparedText(plainString, font);
  const { lines } = layoutWithLines(prepared, maxWidth / POINTS_PER_PIXEL, 1);
  // Trailing spaces at soft breaks are kept in line.text; drop them so each
  // break consumes exactly one character, as breakLinesIntoChunks expects.
  return breakLinesIntoChunks(
    lines.map((line) => line.text.trimEnd()),
    matches,
  );
}

export function getFontString(
  weight: number,
  size: number,
  units: string,
  fontFamily: string,
): string {
  let fontString = `${weight} `;
  fontString += size;
  fontString += `${units} `;
  fontString += fontFamily;
  return fontString;
}

// Markdown link
const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

export interface Match {
  text: string;
  url: string;
  index: number;
  length: number;
}

interface ExtractLinksResult {
  matches: Match[];
  plainString: string;
}

export function extractLinks(markdownString: string): ExtractLinksResult {
  const matches: Match[] = [];
  let plainString = markdownString;
  let offset = 0;

  let match = linkRegex.exec(markdownString);
  while (match !== null) {
    const [fullMatch, text, url] = match;
    const index = match.index - offset;
    matches.push({ text, url, index, length: text.length });

    // Replace only the markdown syntax in plainString, keeping the text
    plainString =
      plainString.slice(0, match.index - offset) +
      text +
      plainString.slice(match.index - offset + fullMatch.length);

    // Update offset
    offset += fullMatch.length - text.length;

    match = linkRegex.exec(markdownString);
  }

  return { matches, plainString };
}

type Chunk = { text: string; isMatch: boolean; url?: string };
export type ChunkedLine = { lineIndex: number; chunks: Chunk[] };

export function breakLinesIntoChunks(
  lines: string[],
  matches: Match[],
): ChunkedLine[] {
  const result: ChunkedLine[] = [];
  let matchIndex = 0;
  let totalChars = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const ChunkedLine: Chunk[] = [];
    let lastIndex = 0;

    while (matchIndex < matches.length) {
      const { index, length, url } = matches[matchIndex];
      const matchStartInLine = index - totalChars;

      if (matchStartInLine >= line.length) break;

      // Add unmatched text before the current match
      if (matchStartInLine > lastIndex) {
        ChunkedLine.push({
          text: line.slice(lastIndex, matchStartInLine),
          isMatch: false,
        });
      }

      // Add the matched text with URL
      const matchEndInLine = Math.min(matchStartInLine + length, line.length);
      ChunkedLine.push({
        text: line.slice(matchStartInLine, matchEndInLine),
        isMatch: true,
        url,
      });

      lastIndex = matchEndInLine;
      matchIndex++;

      if (matchEndInLine === line.length) break;
    }

    // Add any remaining unmatched text after the last match
    if (lastIndex < line.length) {
      ChunkedLine.push({ text: line.slice(lastIndex), isMatch: false });
    }

    result.push({ lineIndex, chunks: ChunkedLine });
    totalChars += line.length + 1; // +1 for newline character
  }

  return result;
} //
