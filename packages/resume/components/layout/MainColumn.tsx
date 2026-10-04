import styled from "styled-components";

import { mobileMediaQuery } from "../../lib/breakpoints";

interface IMainColumnProps {
  scale: number;
}

const MainColumn = styled.div<IMainColumnProps>`
  width: calc(var(--main-width) * ${(props) => props.scale});
  /* Scrollbars that take up width can leave slightly less room than the
     breakpoint assumes; narrow the column rather than let it overflow. */
  max-width: 100%;
  min-height: 100vh;

  ${(props) => mobileMediaQuery(props.scale)} {
    width: 100%;
  }
`;

export default MainColumn;
