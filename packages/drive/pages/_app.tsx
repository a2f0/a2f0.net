import { ThemeProvider, useTheme } from "@tearleads/windowing";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { startClickTracking } from "../src/clickTracking";
import "../src/drive.css";
import {
  DEFAULT_DRIVE_THEME,
  DRIVE_THEMES,
  driveThemeColor,
  THEME_STORAGE_KEY,
} from "../src/themes";

// The app renders in the browser; these tags are what crawlers and link
// previews read without running it.
const TITLE = "Drive – Encrypted Notes and Files · a2f0";
const DESCRIPTION =
  "A little space for your files, powered by Tearleads: a home for notes, files, and whatever comes next, encrypted on your device.";
const CANONICAL_URL = "https://drive.a2f0.net/";
// Rendered from assets/brand/drive.svg by the build (see agent-tool.json).
const OG_IMAGE = {
  url: new URL("og-image.png", CANONICAL_URL).href,
  alt: "The Drive logo, a green folder on a dark slate square",
};
// The error page (pages/404.tsx). Workers serves it for every missing path,
// with a 404, and at /404 with a 200, so it stays out of search and names no
// URL of its own.
const ERROR_PAGE = "/404";

// Inside the theme provider, so the browser's chrome follows the theme switch:
// the default theme's color in the exported HTML, then the visitor's.
function ThemeColor() {
  const { activeTheme } = useTheme();
  return (
    <Head>
      <meta name="theme-color" content={driveThemeColor(activeTheme.id)} />
    </Head>
  );
}

export default function App({ Component, pageProps, router }: AppProps) {
  useEffect(startClickTracking, []);
  const errorPage = router.pathname === ERROR_PAGE;

  return (
    <ThemeProvider
      defaultTheme={DEFAULT_DRIVE_THEME}
      storageKey={THEME_STORAGE_KEY}
      themes={DRIVE_THEMES}
    >
      <Head>
        <title>{TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={DESCRIPTION} />
        {errorPage ? (
          <meta name="robots" content="noindex" />
        ) : (
          <link rel="canonical" href={CANONICAL_URL} />
        )}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="a2f0.net" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        {!errorPage && <meta property="og:url" content={CANONICAL_URL} />}
        <meta property="og:image" content={OG_IMAGE.url} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content={OG_IMAGE.alt} />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <ThemeColor />
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
