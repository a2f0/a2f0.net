import styled, { css } from "styled-components";

interface IProps {
  $isActive: boolean;
  id: string;
  scale: number;
}

export const MenuItems = styled.div<IProps>`
  background: #ffffff;
  border-radius: 0px;
  position: absolute;
  width: calc(${(props) => props.scale} * 200px);
  box-shadow: 0 calc(${(props) => props.scale} * 1px)
    calc(${(props) => props.scale} * 8px) rgba(0, 0, 0, 0.3);
  opacity: 0;
  visibility: hidden;
  transform: translateY(calc(${(props) => props.scale} * -20px));
  font-size: calc(${(props) => props.scale} * 14px);
  font-family: Helvetica;
  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  ${({ $isActive }) =>
    $isActive &&
    css`
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    `}

`;
