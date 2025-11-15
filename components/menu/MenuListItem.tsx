import styled from "styled-components";

interface IProps {
  scale: number;
}

const MenuListItem = styled.li<IProps>`
  cursor: pointer;
  border-bottom: 0px solid #dddddd;
  padding: calc(${(props) => props.scale} * 10px)
    calc(${(props) => props.scale} * 10px);
  &:hover {
    background: #d3d3d3;
  }
`;

export default MenuListItem;
