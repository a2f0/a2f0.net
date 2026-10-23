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

/** The link-preview image the build renders from assets/brand/logo.svg. */
export const OG_IMAGE = {
  url: new URL("og-image.png", SITE_URL).href,
  width: 1200,
  height: 630,
  alt: "The a2f0.net logo, a square shaded from black to light grey",
};

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
