import styled from "styled-components";

import { MOBILE_MEDIA_QUERY } from "../../lib/breakpoints";

interface IMainColumnProps {
  scale: number;
}

const MainColumn = styled.div<IMainColumnProps>`
  width: calc(var(--main-width) * ${(props) => props.scale});
  min-height: 100vh;

  ${MOBILE_MEDIA_QUERY} {
    width: 100vw;
  }
`;

export default MainColumn;
