import type { AppProps } from "next/app";
import Head from "next/head";
import type React from "react";

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

export default function ExperimentApp({
  Component,
  pageProps,
}: AppProps): React.ReactElement {
  return (
    <>
      <Head>
        <title>a2f0 experiment</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
