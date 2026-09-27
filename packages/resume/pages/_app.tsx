import type { AppProps } from "next/app";
import type React from "react";
import { Provider } from "react-redux";
import Analytics from "../components/Analytics";
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
      <Analytics gaId="G-88VBS999NQ" />
    </Provider>
  );
}
