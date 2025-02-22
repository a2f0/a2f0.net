import type {ReactNode} from 'react';
import styled from 'styled-components';

import {useAppSelector} from '../../lib/hooks';
import {selectScale} from '../../lib/resumeConfigSlice';

interface IProps {
  children: ReactNode;
}

interface IBodyContainerProps {
  scale: number;
}

const BodyContainer = styled.div<IBodyContainerProps>`
  min-height: calc(
    100vh - calc(var(--header-height) * ${props => props.scale}) - var(
        --header-bottom-border
      ) - var(--footer-height)
  );
  display: flex;
  flex-direction: column;
  background-color: #202020;
`;

const Body = ({children}: IProps) => {
  const scale = useAppSelector(selectScale);
  return <BodyContainer scale={scale}>{children}</BodyContainer>;
};
export default Body;
