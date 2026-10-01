// The window menus have no checked state, so the active choice is marked in
// its label and the others are indented to match.
export const EM_SPACE = "\u2003";

export const checked = (active: boolean, label: string) =>
  `${active ? "✓" : EM_SPACE} ${label}`;
