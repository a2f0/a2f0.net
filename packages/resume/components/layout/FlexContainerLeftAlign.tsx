import styled from "styled-components";

import { mobileMediaQuery } from "../../lib/breakpoints";

interface IProps {
  $scale: number;
}

const FlexContainerLeftAlign = styled.div<IProps>`
  display: flex;
  justify-content: flex-start;

  ${(props) => mobileMediaQuery(props.$scale)} {
    padding-left: 5px;
  }
`;

export default FlexContainerLeftAlign;
