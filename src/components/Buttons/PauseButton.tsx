import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { PauseIcon } from "../Icons/PauseIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const PauseButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Danger}
    icon={<PauseIcon />}
  />
);

export default PauseButton;
