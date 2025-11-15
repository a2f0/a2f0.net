import styled from "styled-components";

interface IProps {
  scale: number;
}

export const MenuButton = styled.button<IProps>`
  --height: calc(${(props) => props.scale} * 25px);
  align-items: center;
  background: #ffffff;
  border: none;
  border-radius: 0px;
  border: 1px solid gray;
  cursor: pointer;
  display: flex;
  font-size: calc(${(props) => props.scale} * 14px);
  justify-content: space-between;
  padding: calc(${(props) => props.scale} * 4px)
    calc(${(props) => props.scale} * 6px);
  transition: box-shadow 0.4s ease;
  vertical-align: middle;
  margin-left: 0;
  margin-right: 0;
  margin-top: calc(
    (${(props) => props.scale} * var(--header-height)) - var(--height)
  );
  height: var(--height);
  &:hover {
    background: #d3d3d3;
  }

  @media (max-width: 768px) {
    margin-top: calc(var(--header-height) - var(--height));
  }
`;
