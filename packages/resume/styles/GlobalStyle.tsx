import { createGlobalStyle } from "styled-components";

import { MOBILE_MEDIA_QUERY } from "../lib/breakpoints";

const GlobalStyle = createGlobalStyle`
  @font-face {
    font-family: "Arimo";
    src: url("/fonts/Arimo.woff2") format("woff2");
    font-weight: 400;
    font-display: block;
  }

  :root {
    --header-bottom-border: 1px;
    --header-height: 35px;
    --footer-height: 25px;
    --main-width: 850px;
    --main-background-color: #181818;
  }

  html,
  body {
    padding: 0;
    margin: 0;
    background-color: var(--main-background-color);
  }

  ${MOBILE_MEDIA_QUERY} {
    html,
    body {
      /* Content wider than the screen (e.g. an open dropdown) must clip
         rather than expand the mobile layout viewport, which would shrink
         all rendered text. */
      overflow-x: hidden;
    }
  }
`;

export default GlobalStyle;
