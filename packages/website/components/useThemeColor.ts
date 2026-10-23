import { useSyncExternalStore } from "react";

import {
  DEFAULT_WEBSITE_THEME,
  WEBSITE_THEME_COLORS,
  type WebsiteThemeId,
} from "./themes";

// The desktop's theme provider renders only in the browser, below the page's
// head, and stamps the theme it shows on <html data-theme>. The head follows
// that attribute rather than the provider.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

const stampedTheme = () => document.documentElement.dataset.theme;
const exportedTheme = () => undefined;

const isWebsiteThemeId = (id: string | undefined): id is WebsiteThemeId =>
  id !== undefined && Object.hasOwn(WEBSITE_THEME_COLORS, id);

/**
 * The browser chrome's color for the theme showing: the default theme's in the
 * exported HTML and until the desktop stamps a theme, then that theme's.
 */
export function useThemeColor(): string {
  const id = useSyncExternalStore(subscribe, stampedTheme, exportedTheme);
  return WEBSITE_THEME_COLORS[
    isWebsiteThemeId(id) ? id : DEFAULT_WEBSITE_THEME
  ];
}
