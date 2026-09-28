import styled, { css } from "styled-components";

interface IProps {
  $isActive: boolean;
}

// Decorative: options expose their state through aria-pressed or
// aria-current instead.
const CheckMark = styled.span.attrs({ "aria-hidden": true })<IProps>`
  display: inline-block;
  transform: rotate(45deg);
  height: 10px;
  width: 4px;
  border-bottom: 2px solid gray;
  border-right: 2px solid gray;
  ${({ $isActive }) =>
    $isActive &&
    css`
      visibility: visible;
    `}
  ${({ $isActive }) =>
    !$isActive &&
    css`
      visibility: hidden;
    `}
`;

export default CheckMark;
