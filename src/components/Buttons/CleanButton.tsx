import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { CleanIcon } from "../Icons/CleanIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const CleanButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Text}
    icon={<CleanIcon />}
  />
);

export default CleanButton;
