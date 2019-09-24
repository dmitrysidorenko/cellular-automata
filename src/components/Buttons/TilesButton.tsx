import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { TilesIcon } from "../Icons/TilesIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const TilesButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Text}
    icon={<TilesIcon />}
  />
);

export default TilesButton;
