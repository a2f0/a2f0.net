import styled from "styled-components";

interface IProps {
  $scale: number;
}

/** A menu option: a button for actions, or a link when rendered `as` one. */
const MenuAction = styled.button<IProps>`
  display: block;
  box-sizing: border-box;
  width: 100%;
  padding: calc(${(props) => props.$scale} * 10px)
    calc(${(props) => props.$scale} * 10px);
  border: 0;
  background: none;
  color: #333333;
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  &:hover,
  &:focus-visible {
    background: #d3d3d3;
  }
`;

export default MenuAction;
