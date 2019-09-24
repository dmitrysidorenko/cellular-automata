import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { PlayIcon } from "../Icons/PlayIcon";
import { Colors } from "../../design/palette";

type Props = {
  onClick: (e: SyntheticEvent) => void;
};
export const PlayButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={Colors.Primary}
    icon={<PlayIcon />}
  />
);

export default PlayButton;
