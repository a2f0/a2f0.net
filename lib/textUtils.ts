export function getTextWidthInPoints(
  text: string,
  font = '400 12pt Helvetica'
): number {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (context) {
    context.font = font;
    const widthInPixels = context.measureText(text).width;
    const widthInPoints = widthInPixels * 0.75;
    return widthInPoints;
  }
    return 0;
}

function breakString(
  word: string,
  maxWidth: number,
  font = '400 14pt Helvetica'
) {
  const hyphenCharacter = '-';
  const characters = word.split('');
  const lines: string[] = [];
  let currentLine = '';
  characters.forEach((character, index) => {
    const nextLine = `${currentLine}${character}`;
    const lineWidth = getTextWidthInPoints(nextLine, font);
    if (lineWidth >= maxWidth) {
      const currentCharacter = index + 1;
      const isLastLine = characters.length === currentCharacter;
      const hyphenatedNextLine = `${nextLine}${hyphenCharacter}`;
      lines.push(isLastLine ? nextLine : hyphenatedNextLine);
      currentLine = '';
    } else {
      currentLine = nextLine;
    }
  });
  return {hyphenatedStrings: lines, remainingWord: currentLine};
}

export function wrapLabel(
  label: string,
  maxWidth: number,
  font: string // Example: '400 12pt Helvetica'
) {
  const {plainString, matches} = extractLinks(label);
  const words = plainString.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  words.forEach((word, index) => {
    const wordLength = getTextWidthInPoints(`${word}`, font);
    const nextLineLength = getTextWidthInPoints(currentLine, font);
    if (wordLength > maxWidth) {
      // Then the word does not fit onto a single line.
      const {hyphenatedStrings, remainingWord} = breakString(
        word,
        maxWidth,
        font
      );
      lines.push(currentLine, ...hyphenatedStrings);
      currentLine = remainingWord;
    } else if (nextLineLength + wordLength >= maxWidth) {
      // Then the line has reached its maximum length.
      lines.push(currentLine);
      currentLine = word;
    } else {
      // Then the word fits on the line.
      // .filter(Boolean) removes falsy values.
      currentLine = [currentLine, word].filter(Boolean).join(' ');
    }
    const currentWord = index + 1;
    const isLastWord = currentWord === words.length;
    if (isLastWord) {
      lines.push(currentLine);
    }
  });

  const filteredBlankLines = lines.filter(line => line !== '');
  const chunkedLines = breakLinesIntoChunks(filteredBlankLines, matches);
  return chunkedLines;
}

export function getFontString(
  weight: number,
  size: number,
  units: string,
  fontFamily: string
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
    matches.push({text, url, index, length: text.length});

    // Replace only the markdown syntax in plainString, keeping the text
    plainString =
      plainString.slice(0, match.index - offset) +
      text +
      plainString.slice(match.index - offset + fullMatch.length);

    // Update offset
    offset += fullMatch.length - text.length;

    match = linkRegex.exec(markdownString);
  }

  return {matches, plainString};
}

type Chunk = {text: string; isMatch: boolean; url?: string};
export type ChunkedLine = {lineIndex: number; chunks: Chunk[]};

export function breakLinesIntoChunks(
  lines: string[],
  matches: Match[]
): ChunkedLine[] {
  const result: ChunkedLine[] = [];
  let matchIndex = 0;
  let totalChars = 0;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const ChunkedLine: Chunk[] = [];
    let lastIndex = 0;

    while (matchIndex < matches.length) {
      const {index, length, url} = matches[matchIndex];
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
      ChunkedLine.push({text: line.slice(lastIndex), isMatch: false});
    }

    result.push({lineIndex, chunks: ChunkedLine});
    totalChars += line.length + 1; // +1 for newline character
  }

  return result;
} //
