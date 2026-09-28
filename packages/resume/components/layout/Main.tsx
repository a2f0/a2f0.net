import type { ReactNode } from "react";
import styled from "styled-components";

import { useAppSelector } from "../../lib/hooks";
import { selectScale } from "../../lib/resumeConfigSlice";
import Body from "./Body";
import Footer from "./Footer";
import Gutter from "./Gutter";
import Header from "./Header";
import MainColumn from "./MainColumn";
import VisuallyHidden from "./VisuallyHidden";

interface IProps {
  children: ReactNode;
  /** Names the page in the browser tab and in its top-level heading. */
  title: string;
}

const StyledMain = styled.main`
  margin-left: calc(100vw - 100%);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Main = ({ children, title }: IProps) => {
  const scale = useAppSelector(selectScale);
  return (
    <StyledMain>
      <Gutter />
      <MainColumn scale={scale}>
        <VisuallyHidden as="h1">{title}</VisuallyHidden>
        <Header title={title} />
        <Body>{children}</Body>
        <Footer />
      </MainColumn>
      <Gutter />
    </StyledMain>
  );
};

export default Main;
