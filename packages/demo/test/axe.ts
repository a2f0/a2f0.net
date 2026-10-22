import { browser } from "@wdio/globals";
import axe from "axe-core";

declare global {
  interface Window {
    axe: typeof axe;
  }
}

// WCAG 2.0 to 2.2 at levels A and AA, plus axe's best practices.
const TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
];

interface Audit {
  /**
   * Selectors for logos. WCAG 1.4.3 exempts logotypes from contrast
   * minimums, so these are audited with every rule except color contrast.
   */
  logos?: string[];
}

/** Audits the current page with axe, listing each violation and its elements. */
export const axeViolations = async ({ logos = [] }: Audit = {}) => {
  // axe is injected directly: @axe-core/webdriverio switches between frames
  // in a way that fails intermittently over WebDriver BiDi.
  await browser.execute(axe.source);
  return browser.execute(
    async (tags: string[], logos: string[]) => {
      const options: axe.RunOptions = {
        runOnly: { type: "tag", values: tags },
        resultTypes: ["violations"],
        iframes: false,
      };
      const results = [await window.axe.run({ exclude: logos }, options)];
      if (logos.length > 0) {
        results.push(
          await window.axe.run(
            { include: logos },
            { ...options, rules: { "color-contrast": { enabled: false } } },
          ),
        );
      }
      return results.flatMap(({ violations }) =>
        violations.map(
          ({ id, impact, help, nodes }) =>
            `${impact} ${id} (${help}): ${nodes
              .map(({ target }) => target.join(" "))
              .join(", ")}`,
        ),
      );
    },
    TAGS,
    logos,
  );
};
