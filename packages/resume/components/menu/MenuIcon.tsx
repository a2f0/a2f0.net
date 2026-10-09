import type { Icon } from "@phosphor-icons/react";
import styled from "styled-components";

import CheckMark from "./CheckMark";

interface IProps {
  icon: Icon;
  scale: number;
}

// Clears a preceding check mark, which overhangs its box once rotated.
const IconSlot = styled.span<{ $scale: number }>`
  display: inline-flex;
  flex: 0 0 auto;
  opacity: 0.6;
  ${CheckMark} + & {
    margin-left: calc(${(props) => props.$scale} * 4px);
  }
`;

/**
 * An option's icon, drawn as the experiment's start menu draws its own: a
 * 16px Phosphor icon in the text color, dimmed beside the label.
 */
const MenuIcon = ({ icon: OptionIcon, scale }: IProps) => (
  <IconSlot $scale={scale}>
    <OptionIcon aria-hidden focusable="false" size={16 * scale} />
  </IconSlot>
);

export default MenuIcon;
