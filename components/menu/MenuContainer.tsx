import styled from "styled-components";

export const MenuContainer = styled.div`
  position: relative,
  display: flex,
  justify-content: center,
  align-items: center,

  @media (max-width: 768px) {
    justify-content: flex-start;
  }
`;
