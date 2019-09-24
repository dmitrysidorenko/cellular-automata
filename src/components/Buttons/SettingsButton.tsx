import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { SettingsIcon } from "../Icons/SettingsIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const SettingsButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Text}
    icon={<SettingsIcon />}
  />
);

export default SettingsButton;
