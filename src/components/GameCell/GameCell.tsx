import React, { ReactElement, PropsWithChildren } from "react";
import "./GameCell.css";

type Props = PropsWithChildren<{
  alive: boolean;
}>;

export const GameCell = ({ children, alive = false }: Props): ReactElement => (
  <div className={`game-cell ${(alive && " game-cell-alive") || ""}}`}>
    {children}
  </div>
);

export default GameCell;
