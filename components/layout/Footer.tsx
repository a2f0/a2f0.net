import Link from 'next/link';
import React from 'react';
import styled from 'styled-components';

import packageJson from '../../package.json';
import resume from '../../resume.json';
import FlexColumn from './FlexColumn';
import FlexContainerCenterAlign from './FlexContainerCenterAlign';
import FlexContainerColumnPageWidth from './FlexContainerColumnPageWidth';
import FlexContainerLeftAlign from './FlexContainerLeftAlign';
import FlexContainerRightAlign from './FlexContainerRightAlign';

export const VersionContainer = styled.div`
  display: flex;
  height: 25px;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-end;
`;

const StyledLink = styled(Link)`
  color: #202020;
  font-size: 12px;
  font-family: Helvetica;
  font-weight: 10;
  text-decoration: none;
  :hover {
    color: white;
  }
`;

export const StyledFooter = styled.footer`
  height: var(--footer-height);
  color: white;
  background-color: #202020;
  justify-content: center;
  align-items: center;
  position: sticky;
  bottom: 0;
`;

const Footer = () => (
  <StyledFooter>
    <FlexContainerColumnPageWidth>
      <FlexColumn>
        <FlexContainerLeftAlign>
          <VersionContainer>
            <StyledLink href={resume.url}>
              v{packageJson.version}
            </StyledLink>
          </VersionContainer>
        </FlexContainerLeftAlign>
      </FlexColumn>
      <FlexColumn>
        <FlexContainerCenterAlign></FlexContainerCenterAlign>
      </FlexColumn>
      <FlexColumn>
        <FlexContainerRightAlign></FlexContainerRightAlign>
      </FlexColumn>
    </FlexContainerColumnPageWidth>
  </StyledFooter>
);
export default Footer;
