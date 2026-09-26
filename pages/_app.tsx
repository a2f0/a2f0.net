import type { AppProps } from "next/app";
import type React from "react";
import { Provider } from "react-redux";
import { GoogleAnalytics } from "@next/third-parties/google";
import { store } from "../lib/store";

import GlobalStyle from "../styles/GlobalStyle";

export default function MyApp({
  Component,
  pageProps,
}: AppProps): React.ReactElement {
  return (
    <Provider store={store}>
      <GlobalStyle />
      <Component {...pageProps} />
      <GoogleAnalytics gaId="G-88VBS999NQ" />
    </Provider>
  );
}
