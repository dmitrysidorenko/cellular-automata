import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { MenuIcon } from "../Icons/MenuIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const MenuButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Text}
    icon={<MenuIcon />}
  />
);

export default MenuButton;
