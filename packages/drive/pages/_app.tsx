import { ThemeProvider } from "@tearleads/windowing";
import type { AppProps } from "next/app";
import Head from "next/head";
import "../src/drive.css";
import {
  DEFAULT_DRIVE_THEME,
  DRIVE_THEMES,
  THEME_STORAGE_KEY,
} from "../src/themes";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider
      defaultTheme={DEFAULT_DRIVE_THEME}
      storageKey={THEME_STORAGE_KEY}
      themes={DRIVE_THEMES}
    >
      <Head>
        <title>Drive · a2f0</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="description"
          content="A little space for your files, powered by Tearleads."
        />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}
