import React, {
  ReactElement,
  SyntheticEvent,
  useCallback,
  useState
} from "react";
import GameControls from "../GameControls";
import GameMap from "../GameMap";
import Page from "../Page";
import {
  PlusButton,
  PlayPauseButton,
  CleanButton,
  MenuButton,
  SettingsButton
} from "../Buttons";
import GameContext from "../../contexts/GameContext";

const stub = () => {};

const useOnClick = (cb: () => void = stub) => {
  return useCallback(
    (e: SyntheticEvent) => {
      e.preventDefault();
      cb();
    },
    [cb]
  );
};

type Props = {};

const Game = (props: Props): ReactElement => {
  const [danger, setDanger] = useState(false);
  const onPlusClick = useOnClick(() => console.log("+"));
  const onPlayClick = useOnClick(() => {
    setDanger(true);
    console.log(">");
  });
  const onPauseClick = useOnClick(() => {
    setDanger(false);
    console.log("||");
  });
  const onCleanClick = useOnClick(() => console.log("X"));
  const onMenuClick = useOnClick(() => console.log("="));
  return (
    <GameContext.Provider value={{ play: danger }}>
      <Page>
        <GameMap>
          <span>map</span>
        </GameMap>
        <GameControls danger={danger}>
          <PlusButton onClick={onPlusClick} />
          <PlayPauseButton
            play={!danger}
            onClick={danger ? onPauseClick : onPlayClick}
          />
          <CleanButton onClick={onCleanClick} />
          <SettingsButton onClick={onMenuClick} />
        </GameControls>
      </Page>
    </GameContext.Provider>
  );
};
export default Game;
