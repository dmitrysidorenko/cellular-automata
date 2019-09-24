import React, { SyntheticEvent } from "react";
import IconButton from "../IconButton";
import { PlayIcon } from "../Icons/PlayIcon";
import { PauseIcon } from "../Icons/PauseIcon";
import { Colors } from "../../design/palette";

type Props = {
  play: boolean;
  onClick: (e: SyntheticEvent) => void;
};
export const PlayPauseButton = (props: Props) => (
  <IconButton
    {...props}
    tint={Colors.Background}
    borderColor={props.play ? Colors.Primary : Colors.Danger}
    icon={props.play ? <PlayIcon /> : <PauseIcon />}
  />
);

export default PlayPauseButton;
