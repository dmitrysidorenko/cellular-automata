import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { PlusIcon } from "../Icons/PlusIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const PlusButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Text}
    icon={<PlusIcon />}
  />
);

export default PlusButton;
