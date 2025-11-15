import styled from "styled-components";

interface IMainColumnProps {
  scale: number;
}

const MainColumn = styled.div<IMainColumnProps>`
  width: calc(var(--main-width) * ${(props) => props.scale});
  min-height: 100vh;

  @media (max-width: 768px) {
    width: 100vw;
  }
`;

export default MainColumn;
