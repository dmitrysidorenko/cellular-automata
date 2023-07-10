import React, {
  useEffect,
  useState,
  useCallback,
  SyntheticEvent,
  ReactElement,
  useMemo,
  useRef,
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
import { Game, GameState, GameMode } from "../../lib/Game";
import * as config from "../../config";

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
  e: React.MouseEvent<HTMLCanvasElement>,
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

const calcScaledCellWidth = (
  width: number,
  height: number,
  cols: number,
  scale: number
) => {
  const cellWidth = Math.min(width, height) / cols;
  return cellWidth * scale;
};

interface IDashboardProps {
  game: Game;
  borderColor: string;
}
const Dashboard = ({ game, borderColor }: IDashboardProps) => {
  const scoreRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const stepsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let timeout: any = null;
    const updateScore = () => {
      const color =
        game.scoreVelocity === 0
          ? "#ffffff"
          : game.scoreVelocity < 1500
          ? Colors.SuperOldCell
          : game.scoreVelocity < 3000
          ? Colors.VeryOldCell
          : game.scoreVelocity < 6000
          ? Colors.OldCell
          : Colors.AliveCell;
      if (scoreRef.current) {
        scoreRef.current.innerText = Number(game.score).toLocaleString();
        scoreRef.current.style.color = color;
      }
      if (leftRef.current) {
        leftRef.current.innerText = Number(game.steps).toLocaleString();
      }
      if (stepsRef.current) {
        stepsRef.current.innerText = game.currentStep.toLocaleString();
      }
      timeout = setTimeout(updateScore, 100);
    };
    updateScore();
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="dashboard" style={{ borderColor }}>
      <div className="dashboard__left" ref={leftRef} />
      <div className="dashboard__score" ref={scoreRef} />
      <div className="dashboard__steps" ref={stepsRef} />
    </div>
  );
};

type IGameComponentProps = {
  cols: number;
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
  useEffect(() => {
    game.draw();
  }, [game]);

  useEffect(() => {
    const rate = 30;
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
    (e: React.MouseEvent<HTMLCanvasElement>) => {
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

function GameView() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const playgroundRef = React.useRef<HTMLDivElement>(null);
  const [, setRandom] = React.useState<number>(0);
  const playgroundStateRef = React.useRef<{
    scale: number;
    translation: { x: number; y: number };
  }>({ scale: 1, translation: { x: 0, y: 0 } });
  const [menuOpen, setMenuOpen] = React.useState(false);

  const game = useMemo(() => {
    const restoredGame = Game.restore();
    const cols = restoredGame ? restoredGame.cols || 80 : 80;
    const colorPalette = {
      [GameState.running]: {
        liveCell: Colors.AliveCell,
        deadCell: Colors.DeadCell,
        oldCell: Colors.OldCell,
        veryOldCell: Colors.VeryOldCell,
        superOldCell: Colors.SuperOldCell,
        wallCell: Colors.WallCell,
      },
      [GameState.paused]: {
        liveCell: Colors.AliveCell,
        deadCell: Colors.DeadCell,
        oldCell: Colors.OldCell,
        veryOldCell: Colors.VeryOldCell,
        superOldCell: Colors.SuperOldCell,
        wallCell: Colors.WallCell,
      },
      [GameState.stopped]: {
        liveCell: Colors.Secondary,
        deadCell: Colors.DeadCell,
        oldCell: Colors.Secondary,
        veryOldCell: Colors.Secondary,
        superOldCell: Colors.Secondary,
        wallCell: Colors.WallCell,
      },
    };
    const gameInstance = new Game(
      {
        cols,
        speed: 1,
        viewport: playgroundStateRef.current,
        mode: restoredGame ? restoredGame.mode : GameMode.classic,
      },
      canvasRef,
      playgroundRef,
      colorPalette
    );
    if (restoredGame) {
      gameInstance.setState(restoredGame);
    }
    (window as any)["GGG"] = gameInstance;
    gameInstance.onChange((s) => {
      console.log("s", s);
      setGameState((st: any) => ({ ...st, ...s }));
    });
    return gameInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [gameState, setGameState] = React.useState({
    state: game.state,
    cols: game.params.cols,
    speed: game.params.speed,
    score: game.score,
    mode: game.params.mode,
    ready: game.ready,
  });

  useEffect(() => {
    let timeout: any = null;
    const fn = () => {
      game.persist();
      setTimeout(fn, 5000);
    };
    setTimeout(fn, 5000);
    return () => clearTimeout(timeout);
  }, [game]);

  const resetMap = useCallback(() => {
    game.stop();
    game.reset();
  }, [game]);

  useWindowResize();

  const onToggleCell = useCallback(
    (cellIndex: number) => {
      game.toggleCell(cellIndex);
      if (gameState.state === GameState.paused) {
        game.start();
      }
    },
    [game, gameState.state]
  );

  const { minScale, maxScale } = useMemo(() => {
    const screenWidth = game.getWidth();
    const screenHeight = game.getHeight();
    const cellSize = game.calcCellWidth(
      screenWidth,
      screenHeight,
      gameState.cols
    );
    const minCellSize = 1.32;
    const maxCellSize = 60;
    const min = minCellSize / (cellSize ? cellSize : 1);
    const max = maxCellSize / (cellSize ? cellSize : 1);
    return {
      minScale: min,
      maxScale: max,
    };
  }, [game, gameState]);

  return (
    <div className="App">
      <div
        className={`Controls${menuOpen ? " expand" : ""}`}
        style={{
          borderColor:
            gameState.state === GameState.paused ||
            gameState.state === GameState.stopped
              ? Colors.Secondary
              : Colors.Danger,
        }}
      >
        <div className="buttons">
          <PlasticButton
            type="regular"
            size="small"
            onClick={(e: SyntheticEvent) => {
              if (game) {
                game.stop();
                game.updateOnce();
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
              gameState.state === GameState.running
                ? "danger"
                : gameState.state === GameState.paused
                ? "secondary"
                : "primary"
            }
            onClick={(e: SyntheticEvent) => {
              if (
                gameState.state === GameState.running ||
                gameState.state === GameState.paused
              ) {
                game.stop();
              } else {
                game.start();
              }
              e && e.stopPropagation && e.stopPropagation();
              e && e.preventDefault && e.preventDefault();
            }}
          >
            {
              {
                [GameState.stopped]: messages.startBtn,
                [GameState.running]: messages.stopBtn,
                [GameState.paused]: messages.pauseBtn,
              }[gameState.state]
            }
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
          <div className="row">
            <div className="grid-size-buttons">
              {[0.5, 1, 2, 4, 8, 16].map((val) => (
                <PlasticButton
                  key={val}
                  type={gameState.speed === val ? "secondary" : "regular"}
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    game.setSpeed(val);
                  }}
                >
                  {String(val) + "x"}
                </PlasticButton>
              ))}
            </div>
          </div>

          <div className="row">
            <div style={{ marginRight: 4 }}>Mode</div>
            <div className="grid-size-buttons">
              {[GameMode.classic, GameMode.superpower, GameMode.madness].map(
                (val) => (
                  <PlasticButton
                    key={val}
                    type={gameState.mode === val ? "secondary" : "regular"}
                    size="small"
                    onClick={(e) => {
                      e.preventDefault();
                      game.setMode(val);
                    }}
                  >
                    {
                      {
                        [GameMode.classic]: "|",
                        [GameMode.superpower]: "||",
                        [GameMode.madness]: "|||",
                      }[val]
                    }
                  </PlasticButton>
                )
              )}
            </div>
          </div>
          <div className="row">
            <div className="grid-size-buttons">
              {[20, 40, 80, 160, 200, 240, 280].map((v) => (
                <PlasticButton
                  key={v}
                  type={gameState.cols === v ? "secondary" : "regular"}
                  size="small"
                  onClick={(e) => {
                    e.preventDefault();
                    game.setCols(v);
                  }}
                >
                  {String(v)}
                </PlasticButton>
              ))}
            </div>
          </div>
          {/* <PlasticButton
            onClick={(e) => {
              e.preventDefault();
              if (canvasRef.current) {
                downloadCanvasAsImage(canvasRef.current);
              }
            }}
          >
            capture
          </PlasticButton> */}

          <div className="update-block">
            <span className="update-block--text">Reload to update</span>
            <PlasticButton
              type="regular"
              size="small"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await caches
                    .keys()
                    .then((cachesNames) => {
                      if (document.defaultView) {
                        console.log(
                          "Delete " +
                            document.defaultView.location.origin +
                            " caches"
                        );
                      }
                      return Promise.all(
                        cachesNames.map(function (cacheName) {
                          return caches.delete(cacheName).then(function () {
                            console.log(
                              "Cache with name " + cacheName + " is deleted"
                            );
                          });
                        })
                      );
                    })
                    .then(function () {
                      if (document.defaultView) {
                        console.log(
                          "All " +
                            document.defaultView.location.origin +
                            " caches are deleted"
                        );
                      }
                    });
                } catch (error) {}

                window.location.reload();
              }}
            >
              {messages.reloadPageBtn}
            </PlasticButton>
            <div style={{ display: "inline-block", marginLeft: 8 }}>
              ver {config.version}
            </div>
          </div>
        </div>
      </div>
      <div
        className="Playground noselect"
        ref={playgroundRef}
        unselectable="on"
      >
        <Dashboard
          game={game}
          borderColor={
            gameState.state === GameState.paused ||
            gameState.state === GameState.stopped
              ? Colors.Secondary
              : Colors.Danger
          }
        />
        <Playground
          minScale={minScale}
          maxScale={maxScale}
          refApi={playgroundStateRef}
        >
          <GameComponent
            game={game}
            cols={gameState.cols}
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
