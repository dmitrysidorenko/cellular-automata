import React, {
  useEffect,
  useState,
  useCallback,
  SyntheticEvent,
  ReactElement,
  useMemo,
} from "react";
import * as ca from "../../ca";
import { getRealMouseCoords } from "../../utils";
import { Playground } from "../../Playgraoud";
import { Colors } from "../../design/palette";
import PlasticButton from "../../components/Buttons/PlasticButton";
import { PlayIcon } from "../../components/Icons/PlayIcon";
import { PauseIcon } from "../../components/Icons/PauseIcon";
import { CleanIcon } from "../../components/Icons/CleanIcon";
import { MenuIcon } from "../../components/Icons/MenuIcon";
import { PlusIcon } from "../../components/Icons/PlusIcon";
import { ReloadIcon } from "../../components/Icons/ReloadIcon";
import "./Game.css";
import { Game } from "../../lib/Game";

const messages = {
  runOneStep: <PlusIcon />,
  startBtn: <PlayIcon />,
  stopBtn: <PauseIcon />,
  pauseBtn: <PauseIcon />,
  reloadPageBtn: <ReloadIcon />,
  resetMapBtn: <CleanIcon />,
  menuBtn: <MenuIcon />,
};

const CanvasWrapperStyle = { width: "100%", height: "100%" };

function getCellIndexFromClick(
  e: MouseEvent,
  canvas: HTMLCanvasElement,
  {
    offsetX,
    offsetY,
    cellWidth,
    cellHeight,
    cols,
  }: {
    offsetX: number;
    offsetY: number;
    cellWidth: number;
    cellHeight: number;
    cols: number;
  }
) {
  const { x, y } = getRealMouseCoords(canvas, e);
  const sideWidth = cellWidth * cols;
  const realX = x - (offsetX % sideWidth);
  const realY = y - (offsetY % sideWidth);
  const col = (Math.ceil(realX / cellWidth) - 1) % cols;
  const row = (Math.ceil(realY / cellHeight) - 1) % cols;
  const rNew = row % cols;
  const cNew = col % cols;
  const row2 = rNew < 0 ? cols + rNew : rNew;
  const col2 = cNew < 0 ? cols + cNew : cNew;
  // console.log("coords x, y, row, col", x, y, row, col);
  return ca.point2index(cols, [row2, col2]);
}

const gtZero = (val: number) => (val < 1 ? 1 : val);

const calcScaledCellWidth = (
  width: number,
  height: number,
  cols: number,
  scale: number
) => {
  const cellWidth = Math.min(width, height) / cols;
  return cellWidth * scale;
};

type IGameComponentProps = {
  cols: number;
  appState: APP_STATE;
  onToggleCell: (index: number) => void;
  playgroundStateRef: React.MutableRefObject<{
    scale: number;
    translation: { x: number; y: number };
  }>;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  game: Game;
};
const GameComponent = ({
  cols,
  onToggleCell,
  playgroundStateRef,
  canvasRef,
  game,
}: IGameComponentProps): ReactElement => {
  console.log("draw GameComponent");

  useEffect(() => {
    game.draw();
  }, [game]);

  useEffect(() => {
    const rate = 60;
    const frameRateX = 1000 / rate;
    let last = Date.now();
    let index: any = null;

    function drawCallback() {
      const timestamp = Date.now();
      const progress = timestamp - last;
      if (progress >= frameRateX) {
        last = timestamp;
        game.draw();
      }
      index = window.requestAnimationFrame(drawCallback);
    }
    window.requestAnimationFrame(drawCallback);
    return () => {
      window.cancelAnimationFrame(index);
    };
  }, [game]);

  const onCanvasClick = useCallback(
    (e) => {
      e.preventDefault();
      if (!canvasRef.current) {
        return;
      }
      // const cellWidth = Math.min(width, height) / cols;
      // console.log("width, height, cols, scale", width, height, cols, scale);
      const cellWidth = calcScaledCellWidth(
        game.getWidth(),
        game.getHeight(),
        cols,
        playgroundStateRef.current.scale
      );
      const cellIndex = getCellIndexFromClick(e, canvasRef.current, {
        offsetX: game.viewport.translation.x,
        offsetY: game.viewport.translation.y,
        cellWidth,
        cellHeight: cellWidth,
        cols,
      });
      onToggleCell(cellIndex);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [game, cols, onToggleCell]
  );
  return (
    <div style={CanvasWrapperStyle}>
      <canvas ref={canvasRef} onClick={onCanvasClick} />
    </div>
  );
};

const useWindowResize = () => {
  const [[w, h], setWH] = useState([window.innerWidth, window.innerHeight]);
  const onResize = () => {
    setWH([window.innerWidth, window.innerHeight]);
  };
  useEffect(() => {
    window && window.addEventListener("resize", onResize);
    return () => {
      window && window.removeEventListener("resize", onResize);
    };
  }, []);
  return [w, h];
};

enum APP_STATE {
  Off = 0,
  On = 1,
  Sleep = 2,
}

function GameView() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const playgroundRef = React.useRef<HTMLDivElement>(null);
  const [, setRandom] = React.useState<number>(0);
  const playgroundStateRef = React.useRef<{
    scale: number;
    translation: { x: number; y: number };
  }>({ scale: 1, translation: { x: 0, y: 0 } });
  const [appState, setAppState] = React.useState<APP_STATE>(APP_STATE.Off);
  const [cols, setCols] = React.useState(80);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const game = useMemo(() => {
    const g = new Game(
      {
        cols,
        viewport: playgroundStateRef.current,
      },
      canvasRef,
      playgroundRef
    );
    (window as any)["GGG"] = g;
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    game.setCols(cols);
  }, [game, cols]);

  const resetMap = useCallback(() => {
    setAppState(APP_STATE.Off);
    game && game.reset();
  }, [game]);

  useEffect(() => {
    game.onChange((changes) => {
      setAppState(changes.running ? APP_STATE.On : APP_STATE.Sleep);
    });
  }, [game]);

  useEffect(() => {
    if (appState === APP_STATE.Off) {
      game.setColors({
        liveCell: Colors.Secondary,
        deadCell: Colors.DeadCell,
        oldCell: Colors.Secondary,
        veryOldCell: Colors.Secondary,
        superOldCell: Colors.Secondary,
      });
    } else {
      game.setColors({
        liveCell: Colors.AliveCell,
        deadCell: Colors.DeadCell,
        oldCell: Colors.OldCell,
        veryOldCell: Colors.VeryOldCell,
        superOldCell: Colors.SuperOldCell,
      });
    }
    if (appState === APP_STATE.On) {
      game.start();
    } else {
      game.stop();
    }
    game.draw();
  }, [appState, game]);

  useWindowResize();

  const onColsChange = useCallback(
    (value: number) => {
      setAppState(APP_STATE.Off);
      resetMap();
      setCols(gtZero(value));
    },
    [resetMap]
  );

  const onToggleCell = useCallback(
    (cellIndex: number) => {
      if (appState === APP_STATE.Sleep) {
        setAppState(APP_STATE.On);
      }
      game.toggleCell(cellIndex);
    },
    [game, appState, setAppState]
  );

  return (
    <div className="App">
      <div
        className={`Controls${menuOpen ? " expand" : ""}`}
        style={{
          borderColor: [Colors.Secondary, Colors.Danger, Colors.Secondary][
            appState
          ],
        }}
      >
        <div className="buttons">
          <PlasticButton
            type="regular"
            size="small"
            onClick={(e: SyntheticEvent) => {
              if (game) {
                setAppState(APP_STATE.Sleep);
                game.update();
                game.draw();
              }
              e && e.stopPropagation && e.stopPropagation();
              e && e.preventDefault && e.preventDefault();
            }}
          >
            {messages.runOneStep}
          </PlasticButton>
          <PlasticButton
            size="medium"
            type={
              appState === APP_STATE.On
                ? "danger"
                : appState === APP_STATE.Sleep
                ? "secondary"
                : "primary"
            }
            onClick={(e: SyntheticEvent) => {
              setAppState(
                appState === APP_STATE.Off ? APP_STATE.On : APP_STATE.Off
              );
              e && e.stopPropagation && e.stopPropagation();
              e && e.preventDefault && e.preventDefault();
            }}
          >
            {[messages.startBtn, messages.stopBtn, messages.pauseBtn][appState]}
          </PlasticButton>
          <PlasticButton
            type="regular"
            size="small"
            onClick={(e) => {
              e.stopPropagation && e.stopPropagation();
              e.preventDefault && e.preventDefault();
              resetMap();
            }}
          >
            {messages.resetMapBtn}
          </PlasticButton>
          <PlasticButton
            type="regular"
            size="small"
            onClick={(e) => {
              e.stopPropagation && e.stopPropagation();
              e.preventDefault && e.preventDefault();
              setMenuOpen(!menuOpen);
              [50, 100, 150, 200, 250, 300].forEach((ms) =>
                setTimeout(() => {
                  setRandom(Math.random());
                }, ms)
              );
            }}
          >
            {messages.menuBtn}
          </PlasticButton>
        </div>
        <div className="extra">
          <div className="grid-size-buttons">
            {[20, 40, 80, 160, 200, 240, 280].map((v) => (
              <PlasticButton
                type={cols === v ? "secondary" : "regular"}
                size="small"
                onClick={(e) => {
                  e.preventDefault();
                  onColsChange(v);
                }}
              >
                {String(v)}
              </PlasticButton>
            ))}
          </div>
          <div className="update-block">
            <span className="update-block--text">Reload to update</span>
            <PlasticButton
              type="regular"
              size="small"
              onClick={(e) => {
                e.preventDefault();
                window.location.reload();
              }}
            >
              {messages.reloadPageBtn}
            </PlasticButton>
          </div>
        </div>
      </div>
      <div
        className="Playground noselect"
        ref={playgroundRef}
        unselectable="on"
      >
        <Playground minScale={1} maxScale={20} refApi={playgroundStateRef}>
          <GameComponent
            game={game}
            cols={cols}
            appState={appState}
            onToggleCell={onToggleCell}
            playgroundStateRef={playgroundStateRef}
            canvasRef={canvasRef}
          />
        </Playground>
      </div>
      {/* <AddToHomescreen
        title="Wanna app? Add this game to Home Screen!"
        onAddToHomescreenClick={handleAddToHomescreenClick}
      /> */}
    </div>
  );
}

export default GameView;
