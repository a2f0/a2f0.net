import styled from "styled-components";

import packageJson from "../../package.json";
import resume from "@a2f0/shared/resume.json";
import { useAppSelector } from "../../lib/hooks";
import { selectScale } from "../../lib/resumeConfigSlice";
import FlexColumn from "./FlexColumn";
import FlexContainerCenterAlign from "./FlexContainerCenterAlign";
import FlexContainerColumnPageWidth from "./FlexContainerColumnPageWidth";
import FlexContainerLeftAlign from "./FlexContainerLeftAlign";
import FlexContainerRightAlign from "./FlexContainerRightAlign";

const VersionContainer = styled.div`
  display: flex;
  height: 25px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
`;

const VersionLink = styled.a`
  color: #202020;
  font-size: 12px;
  font-family: Helvetica;
  font-weight: 10;
  text-decoration: none;
  /* Hidden until pointed at or reached from the keyboard. */
  &:hover,
  &:focus-visible {
    color: white;
  }
`;

const StyledFooter = styled.footer`
  height: var(--footer-height);
  color: white;
  background-color: #202020;
  justify-content: center;
  align-items: center;
  position: sticky;
  bottom: 0;
`;

const Footer = () => {
  const scale = useAppSelector(selectScale);
  return (
    <StyledFooter>
      <FlexContainerColumnPageWidth>
        <FlexColumn>
          <FlexContainerLeftAlign $scale={scale}>
            <VersionContainer>
              <VersionLink href={resume.url}>
                v{packageJson.version}
              </VersionLink>
            </VersionContainer>
          </FlexContainerLeftAlign>
        </FlexColumn>
        <FlexColumn>
          <FlexContainerCenterAlign />
        </FlexColumn>
        <FlexColumn>
          <FlexContainerRightAlign />
        </FlexColumn>
      </FlexContainerColumnPageWidth>
    </StyledFooter>
  );
};

export default Footer;
