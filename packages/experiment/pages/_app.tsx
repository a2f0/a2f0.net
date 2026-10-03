import type { AppProps } from "next/app";
import Head from "next/head";
import type React from "react";

import "../styles/global.css";

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
