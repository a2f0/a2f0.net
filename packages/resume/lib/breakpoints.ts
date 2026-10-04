// Width of the desktop page column at a scale of 1.
export const MAIN_WIDTH = 850;

/**
 * Media condition for the mobile layout. The desktop column grows with the
 * scale, so the layout switches to mobile once the viewport can no longer
 * hold it; a centered column any wider would spill off both edges, carrying
 * the menu off-screen.
 */
export const mobileQuery = (scale: number) =>
  `(width < ${MAIN_WIDTH * scale}px)`;

// Media query for use in styled-components.
export const mobileMediaQuery = (scale: number) =>
  `@media ${mobileQuery(scale)}`;
