import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
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
`;

export default GlobalStyle;
