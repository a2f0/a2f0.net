import Head from "next/head";
import styled from "styled-components";

import { mobileMediaQuery } from "../../lib/breakpoints";
import { useAppSelector } from "../../lib/hooks";
import { selectScale } from "../../lib/resumeConfigSlice";
import DropdownMenu from "../menu/DropdownMenu";
import FileMenu from "../menu/FileMenu";
import MenuParent from "../menu/MenuParent";
import ViewMenu from "../menu/ViewMenu";
import FlexColumn from "./FlexColumn";
import FlexContainerCenterAlign from "./FlexContainerCenterAlign";
import FlexContainerColumnPageWidth from "./FlexContainerColumnPageWidth";
import FlexContainerLeftAlign from "./FlexContainerLeftAlign";
import FlexContainerRightAlign from "./FlexContainerRightAlign";

interface IProps {
  scale: number;
}

interface HeaderProps {
  title: string;
}

const StyledHeader = styled.header<IProps>`
  height: calc(var(--header-height) * ${(props) => props.scale});
  background-color: #404040;
  color: white;
  justify-content: center;
  align-items: center;
  position: sticky;
  top: 0;
  border-bottom: var(--header-bottom-border) solid #a9a9a9;
  overflow: visible;
  display: flex;

  ${(props) => mobileMediaQuery(props.scale)} {
    padding: 0 5px;
  }
`;

const Header = ({ title }: HeaderProps) => {
  const scale = useAppSelector(selectScale);
  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
      </Head>
      <StyledHeader scale={scale}>
        <FlexContainerColumnPageWidth>
          <FlexColumn>
            <FlexContainerLeftAlign $scale={scale}>
              <MenuParent>
                <DropdownMenu label="File">
                  <FileMenu />
                </DropdownMenu>
                <DropdownMenu label="View">
                  <ViewMenu />
                </DropdownMenu>
              </MenuParent>
            </FlexContainerLeftAlign>
          </FlexColumn>
          <FlexColumn>
            <FlexContainerCenterAlign />
            <FlexContainerCenterAlign />
          </FlexColumn>
          <FlexColumn>
            <FlexContainerRightAlign />
          </FlexColumn>
        </FlexContainerColumnPageWidth>
      </StyledHeader>
    </>
  );
};

export default Header;
