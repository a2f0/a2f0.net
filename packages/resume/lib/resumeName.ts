import resume from "../resume.json";

// The resume spells the name in capitals for display.
const titleCase = (word: string) =>
  word.charAt(0) + word.slice(1).toLowerCase();

/** The resume owner's name, for page titles and headings. */
export const RESUME_NAME = [resume.first_name, resume.last_name]
  .map(titleCase)
  .join(" ");
