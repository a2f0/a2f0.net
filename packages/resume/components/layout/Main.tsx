import type { ReactNode } from "react";
import styled from "styled-components";

import { mobileMediaQuery } from "../../lib/breakpoints";
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

interface IStyledMainProps {
  $scale: number;
}

const StyledMain = styled.main<IStyledMainProps>`
  margin-left: calc(100vw - 100%);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  /* The margin keeps the desktop column centered on the window whether or
     not a scrollbar shows; the mobile column fills the page instead. */
  ${(props) => mobileMediaQuery(props.$scale)} {
    margin-left: 0;
  }
`;

const Main = ({ children, title }: IProps) => {
  const scale = useAppSelector(selectScale);
  return (
    <StyledMain $scale={scale}>
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
