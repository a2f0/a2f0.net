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
      </Head>
      <Component {...pageProps} />
    </>
  );
}
