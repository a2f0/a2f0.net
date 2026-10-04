import { createGlobalStyle } from "styled-components";

import { MAIN_WIDTH, mobileMediaQuery } from "../lib/breakpoints";
import { useAppSelector } from "../lib/hooks";
import { selectScale } from "../lib/resumeConfigSlice";

interface IProps {
  $scale: number;
}

const StyledGlobal = createGlobalStyle<IProps>`
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
    --main-width: ${MAIN_WIDTH}px;
    --main-background-color: #181818;
  }

  html,
  body {
    padding: 0;
    margin: 0;
    background-color: var(--main-background-color);
  }

  ${(props) => mobileMediaQuery(props.$scale)} {
    html,
    body {
      /* Content wider than the screen (e.g. an open dropdown) must clip
         rather than expand the mobile layout viewport, which would shrink
         all rendered text. Unlike hidden, clip does not make body a scroll
         container, which would stop the header and footer from sticking. */
      overflow-x: clip;
    }
  }
`;

const GlobalStyle = () => {
  const scale = useAppSelector(selectScale);
  return <StyledGlobal $scale={scale} />;
};

export default GlobalStyle;
