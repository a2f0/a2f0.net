import type { AppProps } from "next/app";
import Head from "next/head";
import { type ReactElement, useEffect } from "react";
import { Provider } from "react-redux";
import Analytics from "../components/Analytics";
import { startClickTracking } from "../lib/clickTracking";
import { store } from "../lib/store";

import GlobalStyle from "../styles/GlobalStyle";

export default function MyApp({
  Component,
  pageProps,
}: AppProps): ReactElement {
  useEffect(startClickTracking, []);

  return (
    <Provider store={store}>
      {/* Here rather than in the layout's header, so the 404 page links them too. */}
      <Head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <GlobalStyle />
      <Component {...pageProps} />
      <Analytics gaId="G-88VBS999NQ" />
    </Provider>
  );
}
