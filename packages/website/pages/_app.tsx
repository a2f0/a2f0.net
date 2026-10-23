import { serializeJsonLd } from "@a2f0/shared/jsonLd";
import type { AppProps } from "next/app";
import Head from "next/head";
import { type ReactElement, useEffect } from "react";

import { startClickTracking } from "../components/clickTracking";
import {
  SITE_DESCRIPTION,
  SITE_JSON_LD,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
  THEME_COLOR,
} from "../components/siteMetadata";

import "../styles/global.css";
import "../styles/themes.css";
// Next.js takes global stylesheets only from here, so each mini-app's
// stylesheet, kept beside the app, is imported here too.
import "../mini-apps/MiniApps.css";
import "../mini-apps/ascii-art/AsciiArt.css";
import "../mini-apps/dnbm/Dnbm.css";
import "../mini-apps/dnbm-player/DnbmPlayer.css";
import "../mini-apps/resume/Resume.css";
import "../mini-apps/skyline/Skyline.css";

export default function WebsiteApp({
  Component,
  pageProps,
}: AppProps): ReactElement {
  useEffect(startClickTracking, []);

  return (
    <>
      <Head>
        <title>{SITE_TITLE}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content={SITE_DESCRIPTION} />
        <meta name="theme-color" content={THEME_COLOR} />
        <link rel="canonical" href={SITE_URL} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SITE_TITLE} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta name="twitter:card" content="summary" />
        <script
          type="application/ld+json"
          key="website"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: The JSON-LD is built from constants and escapes "<".
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(SITE_JSON_LD) }}
        />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
