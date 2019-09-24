import React, { ReactElement, useContext } from "react";
import GameContext from "../../contexts/GameContext";
import "./GameMap.css";

type Props = {
  children: ReactElement;
};

export const GameMap = ({ children }: Props): ReactElement => {
  const game = useContext(GameContext);
  return (
    <div className="game-map">
      <pre>{JSON.stringify(game, null, 2)}</pre>
      {children}
    </div>
  );
};

export default GameMap;
