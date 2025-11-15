import styled from "styled-components";

import { useAppSelector } from "../../lib/hooks";
import { selectScale } from "../../lib/resumeConfigSlice";

interface IProps {
  scale: number;
}

const StyledDiv = styled.div<IProps>`
  position: sticky;
  top: calc(var(--header-height) * ${(props) => props.scale});
  flex-grow: 1;
`;

const Layout = () => {
  const scale = useAppSelector(selectScale);
  return <StyledDiv scale={scale} />;
};

export default Layout;
