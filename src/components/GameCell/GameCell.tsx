import React, { ReactElement, ReactChildren } from "react";
import "./GameCell.css";

type Props = {
  children: ReactChildren;
  alive: boolean;
};

export const GameCell = ({ children, alive = false }: Props): ReactElement => (
  <div className={`game-cell ${(alive && " game-cell-alive") || ""}}`}>
    {children}
  </div>
);

export default GameCell;
