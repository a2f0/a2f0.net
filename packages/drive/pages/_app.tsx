import { ThemeProvider } from "@tearleads/windowing";
import type { AppProps } from "next/app";
import Head from "next/head";
import { useEffect } from "react";
import { startClickTracking } from "../src/clickTracking";
import "../src/drive.css";
import {
  DEFAULT_DRIVE_THEME,
  DRIVE_THEMES,
  THEME_STORAGE_KEY,
} from "../src/themes";

// The app renders in the browser; these tags are what crawlers and link
// previews read without running it.
const TITLE = "Drive – Encrypted Notes and Files · a2f0";
const DESCRIPTION =
  "A little space for your files, powered by Tearleads: a home for notes, files, and whatever comes next, encrypted on your device.";
const CANONICAL_URL = "https://drive.a2f0.net/";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(startClickTracking, []);

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
        {/* Graphite's paper, the default theme's background. */}
        <meta name="theme-color" content="#161616" />
        <link rel="canonical" href={CANONICAL_URL} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="a2f0.net" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={CANONICAL_URL} />
        <meta name="twitter:card" content="summary" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
