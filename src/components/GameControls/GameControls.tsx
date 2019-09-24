import React, { ReactElement } from "react";
import ButtonsSet from "../ButtonsSet";
import IconButton from "../IconButton";
import "./GameControls.css";

type Props = {
  children: IconButton[];
  danger: boolean;
};

export const GameControls = ({
  children = [],
  danger = false
}: Props): ReactElement => {
  return (
    <div
      className={`game-controls ${(danger && " game-controls-danger") || ""}`}
    >
      <ButtonsSet children={children} />
    </div>
  );
};

export default GameControls;
