import styled from "styled-components";

import { MOBILE_MEDIA_QUERY } from "../../lib/breakpoints";

export const MenuContainer = styled.div`
  position: relative,
  display: flex,
  justify-content: center,
  align-items: center,

  ${MOBILE_MEDIA_QUERY} {
    justify-content: flex-start;
  }
`;
