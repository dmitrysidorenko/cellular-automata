import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import AddToHomescreen from "react-add-to-homescreen";
import * as ca from "./ca";
import { relMouseCoords } from "./utils";
import { Playground } from "./Playgraoud";
import { Colors } from "./design/palette";
import PlayButtonGif from "./components/Buttons/PlayButtonGif";
import "./styles.css";

window["Colors"] = Colors;

const colors = {
  grid: Colors.Background,
  deadCell: Colors.DeadCell,
  liveCell: Colors.Primary,
  startBtn: Colors.Primary,
  stopBtn: Colors.Danger
};
const messages = {
  runOneStep: "1️⃣",
  startBtn: "🎬",
  stopBtn: "◽️",
  reloadPageBtn: "🔄",
  resetMapBtn: "🚮"
};

const ENABLE_CANVAS_ALPHA = true;

function drawRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  backgroundColor: string,
  borderColor: string
) {
  ctx.beginPath();
  const borderw = 1;
  const dborderw = borderw * 4;
  ctx.rect(
    x,
    y,
    w > dborderw ? w - borderw : w,
    h > dborderw ? h - borderw : h
  );
  if (borderColor) {
    // ctx.strokeStyle = borderColor;
    // ctx.stroke();
  }
  if (backgroundColor) {
    // ctx.fillStyle = backgroundColor;
    ctx.fill();
  }
}

function prepareCanvas(
  ctx: CanvasRenderingContext2D | null,
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  cellWidthScaled: number
) {
  if (!canvas || !ctx) {
    return;
  }
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = colors.liveCell;
  ctx.lineWidth = 4; //cellWidthScaled > 4 ? 1 : 0;
  canvas.width = width;
  canvas.height = height;
}

function drawPoint(
  ctx: any,
  cell: ICell,
  xi: number,
  yi: number,
  options: {
    cellWidth: number;
    cellHeight: number;
    offsetX: number;
    offsetY: number;
    height: number;
    width: number;
  },
  color: string,
  k: number = 1
) {
  const x = xi * options.cellWidth + options.offsetX;
  const y = yi * options.cellHeight + options.offsetY;
  if (
    x > -options.cellWidth &&
    y >= -options.cellHeight &&
    x < options.width &&
    y < options.height
  ) {
    ctx.fillStyle = color;
    ctx.strokeStyle = colors.grid;
    drawRect(
      ctx,
      cell.value ? x + k : x + k,
      cell.value ? y + k : y + k,
      options.cellWidth - k * 2,
      options.cellHeight - k * 2,
      color,
      colors.grid
    );
  }
}

interface ICell {
  x: number;
  y: number;
  value: boolean;
  age: number;
  index: number;
  updated: boolean;
}
function makeCell(
  value: boolean,
  index: number,
  cols: number,
  age: number = 0
): ICell {
  const { x, y } = ca.index2point(cols, index);
  return { x, y, value, index, updated: true, age };
}

const CanvasWrapperStyle = { width: "100%", height: "100%" };

function getRealMouseCoords(
  canvas: HTMLCanvasElement,
  event: React.SyntheticEvent
) {
  return relMouseCoords.call(canvas, event);
}

function getCellIndexFromClick(
  e: React.SyntheticEvent,
  canvas: HTMLCanvasElement,
  {
    offsetX,
    offsetY,
    cellWidth,
    cellHeight,
    cols
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

const from = (n: number, fn = (_: any, i: number): any => i): any[] =>
  Array.from({ length: n }, fn);

const makeMatrix = (cols: number) =>
  from(cols * cols, (_: any, index: number) => {
    return makeCell(false, index, cols);
  });

const gtZero = (val: number) => (val < 1 ? 1 : val);

const makeCellSiblingsMap = (cols: number, matrix: ICell[]) => {
  return matrix.map(cell => {
    const { x, y } = cell;
    return [
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, -1),
        ca.getLoopCoord(cols, x, -1)
      ]),
      ca.point2index(cols, [y, ca.getLoopCoord(cols, x, -1)]),
      ca.point2index(cols, [ca.getLoopCoord(cols, y, -1), x]),
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, +1),
        ca.getLoopCoord(cols, x, +1)
      ]),
      ca.point2index(cols, [y, ca.getLoopCoord(cols, x, +1)]),
      ca.point2index(cols, [ca.getLoopCoord(cols, y, +1), x]),
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, -1),
        ca.getLoopCoord(cols, x, +1)
      ]),
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, +1),
        ca.getLoopCoord(cols, x, -1)
      ])
    ].filter(v => v !== null);
  });
};

export interface IGameProps {
  cols: number;
  viewport: IGameViewport;
}
export interface IViewportTranslation {
  x: number;
  y: number;
}
export interface IGameViewport {
  width: number;
  height: number;
  scale: number;
  translation: IViewportTranslation;
}
export interface IGameViewportUpdate {
  width?: number;
  height?: number;
  scale?: number;
  translation?: IViewportTranslation;
}

export interface IGameColors {
  liveCell: string;
  deadCell: string;
  oldCell: string;
  veryOldCell: string;
  superOldCell: string;
}

export interface IGame {
  props: IGameProps;
  matrix: ICell[];
  matrixBuffer: ICell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  ctx: CanvasRenderingContext2D | null;
  generation: number;
  updateTimeout?: number;
  colors: IGameColors;
  update(): void;
  toggleCell(index: number): void;
  draw(): void;
  reset(): void;
  swap(): void;
  setViewport(viewport: IGameViewportUpdate): void;
  setCols(cols: number): void;
  setColors(colors: IGameColors): void;
  onChange(cb: GameStateChangeCallback): void;
}

const calcCellWidth = (width: number, height: number, cols: number) => {
  const cellWidth = Math.min(width, height) / cols;
  return cellWidth;
};
const calcScaledCellWidth = (
  width: number,
  height: number,
  cols: number,
  scale: number
) => {
  const cellWidth = Math.min(width, height) / cols;
  return cellWidth * scale;
};

type GameChangeStateEvent = { running: boolean };
type GameStateChangeCallback = (changes: GameChangeStateEvent) => void;
export class Game implements IGame {
  props: IGameProps;
  matrix: ICell[];
  matrixBuffer: ICell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  ctx: CanvasRenderingContext2D | null;
  generation: number;
  updateTimeout?: number = 0;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  clean: boolean;
  colors: IGameColors = {
    liveCell: Colors.AliveCell,
    oldCell: Colors.OldCell,
    veryOldCell: Colors.VeryOldCell,
    superOldCell: Colors.SuperOldCell,
    deadCell: Colors.DeadCell
  };
  _gameStateChangeCallbacks: GameStateChangeCallback[] = [];
  constructor(
    props: IGameProps,
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  ) {
    this.generation = 0;
    this.ctx = null;
    if (canvasRef.current) {
      this.ctx = canvasRef.current.getContext("2d", {
        alpha: ENABLE_CANVAS_ALPHA
      });
    }
    this.canvasRef = canvasRef;
    this.props = props;
    this.matrix = [];
    this.matrixBuffer = [];
    this.siblingsMap = [];
    this.viewport = props.viewport;
    this.clean = false;
    this.reset();
  }
  setViewport(viewport: IGameViewportUpdate) {
    this.viewport = { ...this.viewport, ...viewport };
    this.clean = false;
  }
  setCols(cols: number) {
    if (this.props.cols !== cols) {
      this.props.cols = cols;
      this.reset();
    }
  }
  setColors = (colors: IGameColors) => {
    this.colors = colors;
  };
  onChange = (cb: GameStateChangeCallback): void => {
    if (this._gameStateChangeCallbacks.indexOf(cb) === -1) {
      this._gameStateChangeCallbacks.push(cb);
    }
  };
  reset = () => {
    this.matrix = makeMatrix(this.props.cols);
    this.matrixBuffer = makeMatrix(this.props.cols);
    this.siblingsMap = makeCellSiblingsMap(this.props.cols, this.matrix);
    this.generation = 0;
    this.clean = false;
  };
  swap = () => {
    const tmp = this.matrix;
    this.matrix = this.matrixBuffer;
    this.matrixBuffer = tmp;
  };
  toggleCell = (index: number) => {
    this.matrix[index].value = !this.matrix[index].value;
    this.clean = false;
  };
  start = () => {
    const updateStepInterval = 100;
    let lastTimestamp = Date.now();
    const upd = () => {
      const currentTimestamp = Date.now();
      const diff = currentTimestamp - lastTimestamp;
      let afterTimestamp = Date.now();
      let shouldStop = false;
      if (diff >= updateStepInterval) {
        this.update();
        if (this.clean) {
          shouldStop = true;
          const changes = {
            running: false
          };
          this._gameStateChangeCallbacks.forEach(cb => cb(changes));
        }
        lastTimestamp = currentTimestamp;
        afterTimestamp = Date.now();
        // console.log("took", afterTimestamp - currentTimestamp);
      }
      if (!shouldStop) {
        this.updateTimeout = setTimeout(
          upd,
          updateStepInterval - (afterTimestamp - currentTimestamp)
        );
      }
    };
    upd();
    // this.updateInterval = setInterval(this.update, 100);
  };
  stop = () => {
    clearTimeout(this.updateTimeout);
  };
  update = () => {
    const { matrix, matrixBuffer, siblingsMap } = this;
    // const buffer = matrix.map(c => ({ ...c }));
    matrix.forEach((cell, i) => {
      const sum = siblingsMap[i].reduce(
        (total, siblingIndex) => total + (matrix[siblingIndex].value ? 1 : 0),
        0
      );
      // console.log("sum", sum);
      let result = false;
      if (cell.value && sum > 1 && sum < 4) {
        result = true;
      } else {
        if (sum === 3) {
          result = true;
        }
      }
      const bufferCell = matrixBuffer[i];
      if (result) {
        bufferCell.age = cell.value ? bufferCell.age + 1 : 1;
      } else {
        bufferCell.age = 0;
      }
      bufferCell.value = result;
      bufferCell.updated = cell.value !== result;

      if (cell.value !== result && this.clean) {
        this.clean = false;
      }
    });
    // this.matrix = buffer;
    this.swap();
  };
  options: {
    cellWidth: number;
    cellHeight: number;
    offsetX: number;
    offsetY: number;
    height: number;
    width: number;
  } = {
    cellWidth: 0,
    cellHeight: 0,
    offsetX: 0,
    offsetY: 0,
    height: 0,
    width: 0
  };
  draw = (force: boolean = false) => {
    if (!force && this.clean) {
      return;
    }
    if (!this.ctx && !this.canvasRef.current) {
      return;
    }

    if (!this.ctx && this.canvasRef.current) {
      this.ctx = this.canvasRef.current.getContext("2d", {
        alpha: ENABLE_CANVAS_ALPHA
      });
    }
    const cols = this.props.cols;
    const width = this.viewport.width;
    const height = this.viewport.height;
    const scale = this.viewport.scale;
    const translation = this.viewport.translation;
    const offsetX = translation.x;
    const offsetY = translation.y;
    const cellWidth = calcCellWidth(width, height, cols);
    const cellWidthScaled = cellWidth * scale;
    this.options.cellWidth = cellWidthScaled;
    this.options.cellHeight = cellWidthScaled;
    this.options.offsetX = offsetX;
    this.options.offsetY = offsetY;
    this.options.height = height;
    this.options.width = width;
    // console.log(widthXscale, colsXcellWidth, maxNumberOnScreen);
    const colsXVisible = Math.floor(width / cellWidthScaled) + 1;
    const colsYVisible = Math.floor(height / cellWidthScaled) + 1;
    const offsetXCols = -Math.ceil(offsetX / cellWidthScaled);
    const offsetYCols = -Math.ceil(offsetY / cellWidthScaled);
    this.canvasRef.current &&
      prepareCanvas(
        this.ctx,
        this.canvasRef.current,
        width,
        height,
        cellWidthScaled
      );
    const k = scale > 3 ? 1 : scale > 5 ? 2 : 0;
    for (
      let rowV = offsetYCols;
      rowV <= colsYVisible + offsetYCols;
      rowV += 1
    ) {
      for (
        let colV = offsetXCols;
        colV <= colsXVisible + offsetXCols;
        colV += 1
      ) {
        const rNew = rowV % cols;
        const cNew = colV % cols;
        const r = rNew < 0 ? cols + rNew : rNew;
        const c = cNew < 0 ? cols + cNew : cNew;
        const index2Draw = ca.point2index(cols, [r, c]);
        const cell = this.matrix[index2Draw];
        if (cell) {
          const rs = Math.floor(rowV / cols);
          const cs = Math.floor(colV / cols);
          const x = cell.x + cs * cols;
          const y = cell.y + rs * cols;
          // debugger;
          let color = this.colors.deadCell;
          if (cell.value) {
            if (cell.age > 16) {
              color = this.colors.superOldCell;
            } else if (cell.age > 8) {
              color = this.colors.veryOldCell;
            } else if (cell.age > 2) {
              color = this.colors.oldCell;
            } else {
              color = this.colors.liveCell;
            }
          }
          drawPoint(this.ctx, cell, x, y, this.options, color, k);
        } else {
          debugger;
        }
      }
    }

    // for (let cellIndex = 0; cellIndex < this.matrix.length; cellIndex++) {
    //   const cell = this.matrix[cellIndex];
    //   drawPoint(this.ctx, cell, cell.x, cell.y, this.options);
    // }

    this.clean = true;
  };
}

type GameComponentProps = {
  cols: number;
  width: number;
  height: number;
  translation: IViewportTranslation;
  scale: number;
  onInit: Function;
  appState: AppState;
  onToggleCell: (index: number) => void;
};
function GameComponent({
  cols,
  width,
  height,
  translation,
  scale,
  onInit,
  onToggleCell
}: GameComponentProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const game = React.useMemo(() => {
    return new Game(
      {
        cols,
        viewport: { translation, scale, width, height }
      },
      canvasRef
    );
  }, []);

  useEffect(() => onInit(game), [game, onInit]);
  useEffect(() => {
    game.setCols(cols);
  }, [cols, game]);

  useEffect(() => {
    if (!game) {
      return;
    }
    game.setViewport({
      height,
      width,
      scale,
      translation
    });
  }, [translation, scale, height, width, game]);

  useEffect(() => {
    game && game.draw();
  }, [game]);

  useEffect(() => {
    if (!game) {
      return;
    }
    const rate = 60;
    const frameRateX = 1000 / rate;
    let last = Date.now();
    let index: any = null;

    function draw() {
      const timestamp = Date.now();
      const progress = timestamp - last;
      if (progress >= frameRateX) {
        last = timestamp;
        game.draw();
      }
      // setTimeout(() => {
      index = window.requestAnimationFrame(draw);
      // }, 0);
    }
    window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(index);
    };
  }, [game]);

  const onCanvasClick = useCallback(
    e => {
      e.preventDefault();
      if (!game || !canvasRef.current) {
        return;
      }
      // const cellWidth = Math.min(width, height) / cols;
      // console.log("width, height, cols, scale", width, height, cols, scale);
      const cellWidth = calcScaledCellWidth(width, height, cols, scale);
      const cellIndex = getCellIndexFromClick(e, canvasRef.current, {
        offsetX: game.viewport.translation.x,
        offsetY: game.viewport.translation.y,
        cellWidth,
        cellHeight: cellWidth,
        cols
      });
      game.toggleCell(cellIndex);
      onToggleCell(cellIndex);
    },
    [width, height, cols, scale, game, onToggleCell]
  );
  return (
    <div style={CanvasWrapperStyle}>
      <canvas ref={canvasRef} onClick={onCanvasClick} />
    </div>
  );
}

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
const handleAddToHomescreenClick = () => {
  alert(`
      1. Open Share menu
      2. Tap on "Add to Home Screen" button`);
};

type AppOff = 0;
type AppOn = 1;
type AppSleep = 2;
type AppState = AppOn | AppOff | AppSleep;
function App() {
  const playgroundRef = React.useRef<HTMLDivElement>(null);
  const playgroundApiRef = React.useRef<{ setScale: (scale: number) => void }>(
    null
  );
  const [appState, setAppState] = React.useState<AppState>(0);
  const [game, setGame] = React.useState<Game>();
  const [cols, setCols] = React.useState(80);

  const resetMap = useCallback(() => {
    setAppState(0);
    // playgroundApiRef.current && playgroundApiRef.current.setScale(1);
    game && game.reset();
  }, [game]);

  useEffect(() => {
    game &&
      game.onChange(changes => {
        setAppState(changes.running ? 1 : 2);
      });
  }, [game]);

  useEffect(() => {
    if (game) {
      if (appState === 0) {
        game.setColors({
          liveCell: Colors.Secondary,
          deadCell: Colors.DeadCell,
          oldCell: Colors.Secondary,
          veryOldCell: Colors.Secondary,
          superOldCell: Colors.Secondary
        });
      } else {
        game.setColors({
          liveCell: Colors.AliveCell,
          deadCell: Colors.DeadCell,
          oldCell: Colors.OldCell,
          veryOldCell: Colors.VeryOldCell,
          superOldCell: Colors.SuperOldCell
        });
      }

      if (appState === 1) {
        game.start();
      } else {
        game.stop();
      }
      game.draw(true);
    }
  }, [appState, game]);

  useWindowResize();

  const width =
    (playgroundRef.current && playgroundRef.current.offsetWidth) || 0;
  const height =
    (playgroundRef.current && playgroundRef.current.offsetHeight) || 0;

  const onColsChange = useCallback(
    e => {
      const value = +e.target.value;
      setAppState(0);
      resetMap();
      setCols(gtZero(value));
    },
    [resetMap]
  );

  return (
    <div className="App">
      <div
        className="Controls"
        style={{
          borderColor: [Colors.Secondary, Colors.Danger, Colors.Secondary][
            appState
          ]
        }}
      >
        <button
          className="emoji"
          onClick={e => {
            if (game) {
              setAppState(2);
              game.update();
              game.draw(true);
            }

            e && e.stopPropagation && e.stopPropagation();
            e && e.preventDefault && e.preventDefault();
          }}
        >
          {messages.runOneStep}
        </button>
        <PlayButtonGif
          running={appState === 1}
          suspend={appState === 2}
          onClick={e => {
            setAppState(appState === 0 ? 1 : 0);
            e && e.stopPropagation && e.stopPropagation();
            e && e.preventDefault && e.preventDefault();
          }}
        />
        {/* <button
          className="emoji"
          style={{
            backgroundColor: appState ? colors.stopBtn : colors.startBtn
          }}
          onClick={e => {
            setAppState(appState === 0 ? 1 : 0);
            e && e.stopPropagation && e.stopPropagation();
            e && e.preventDefault && e.preventDefault();
          }}
        >
          {appState ? messages.stopBtn : messages.startBtn}
        </button> */}
        <button
          className="emoji"
          onClick={e => {
            e.stopPropagation && e.stopPropagation();
            e.preventDefault && e.preventDefault();
            resetMap();
          }}
        >
          {messages.resetMapBtn}
        </button>
        <button
          className="emoji"
          onTouchStart={e => {
            // console.log("click");
            window.location.reload();
          }}
          onClick={e => {
            // console.log("click");
            window.location.reload();
          }}
        >
          {messages.reloadPageBtn}
        </button>
        <label>
          <select value={cols} onChange={onColsChange}>
            {[10, 20, 40, 80, 100, 120, 160].map(v => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div
        className="Playground noselect"
        ref={playgroundRef}
        unselectable="on"
      >
        <Playground
          minScale={cols <= 40 ? 0.6 : 1}
          maxScale={cols / 5}
          width={width}
          height={height}
          refApi={playgroundApiRef}
        >
          {({
            scale,
            translation
          }: {
            scale: number;
            translation: IViewportTranslation;
          }) => {
            return (
              <GameComponent
                onInit={setGame}
                cols={cols}
                scale={scale}
                translation={translation}
                width={width}
                height={height}
                appState={appState}
                onToggleCell={() => {
                  if (appState === 2) {
                    setAppState(1);
                  }
                }}
              />
            );
          }}
        </Playground>
      </div>
      <AddToHomescreen
        title="Wanna app? Add this game to Home Screen!"
        onAddToHomescreenClick={handleAddToHomescreenClick}
      />
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
