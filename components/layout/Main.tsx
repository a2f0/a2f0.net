import type {ReactNode} from 'react';
import styled from 'styled-components';

import {useAppSelector} from '../../lib/hooks';
import {selectScale} from '../../lib/resumeConfigSlice';
import Body from './Body';
import Footer from './Footer';
import Gutter from './Gutter';
import Header from './Header';
import MainColumn from './MainColumn';

interface IProps {
  children: ReactNode;
}

const StyledMain = styled.main`
  margin-left: calc(100vw - 100%);
  padding: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const Main = ({children}: IProps) => {
  const scale = useAppSelector(selectScale);
  return (
    <StyledMain>
      <Gutter />
      <MainColumn scale={scale}>
        <Header />
        <Body>{children}</Body>
        <Footer />
      </MainColumn>
      <Gutter />
    </StyledMain>
  );
};

export default Main;
