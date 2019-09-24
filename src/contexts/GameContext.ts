import React from "react";

export type GameContext = {
  play: boolean;
};

export default React.createContext({
  play: false
});
