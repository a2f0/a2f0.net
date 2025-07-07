import type { AppProps } from "next/app";
import type React from "react";
import { Provider } from "react-redux";
import { GoogleAnalytics } from "@next/third-parties/google";
import { store } from "../lib/store";
import StyledComponentsRegistry from "../lib/registry";

import GlobalStyle from "../styles/GlobalStyle";

export default function MyApp({
  Component,
  pageProps,
}: AppProps): React.ReactElement {
  return (
    <StyledComponentsRegistry>
      <Provider store={store}>
        <GlobalStyle />
        <Component {...pageProps} />
      </Provider>
      <GoogleAnalytics gaId="G-88VBS999NQ" />
    </StyledComponentsRegistry>
  );
}
