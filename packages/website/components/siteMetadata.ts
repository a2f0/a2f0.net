import { RESUME_NAME } from "@a2f0/shared/resumeName";

/**
 * The desktop's search and link-preview metadata. The page is rendered in the
 * browser, so these tags in the exported HTML are what crawlers and link
 * previews read without running it. Every route (/app/<app id>) serves the
 * same page, so each names the root as canonical.
 */
export const SITE_URL = "https://a2f0.net/";

export const SITE_NAME = "a2f0.net";

export const SITE_TITLE =
  "Resume, Graffiti, Skyline, and Drum and Bass – a2f0.net";

export const SITE_DESCRIPTION =
  "Dan Sullivan's resume, the a2f0 graffiti artwork, a 3D Chicago skyline, and the dnbm drum and bass sequencer and player in draggable, resizable windows.";

/** Graphite's desk, the default theme's background. */
export const THEME_COLOR = "#000000";

export const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
  author: {
    "@type": "Person",
    name: RESUME_NAME,
    url: "https://resume.a2f0.net/",
  },
};
