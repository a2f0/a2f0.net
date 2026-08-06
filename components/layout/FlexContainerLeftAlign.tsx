import styled from "styled-components";

import { MOBILE_MEDIA_QUERY } from "../../lib/breakpoints";

const FlexContainerLeftAlign = styled.div`
  display: flex;
  justify-content: flex-start;

  ${MOBILE_MEDIA_QUERY} {
    padding-left: 5px;
  }
`;

export default FlexContainerLeftAlign;
