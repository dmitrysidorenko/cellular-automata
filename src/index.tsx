import React, { CanvasHTMLAttributes, DOMElement } from "react";
import ReactDOM from "react-dom";
import R from "ramda";
import * as ca from "./ca";
import { relMouseCoords, useInterval } from "./utils";
import { setup as setupZoom } from "./zoom";
import { Playground } from "./Playgraoud";
import "./styles.css";

const colors = {
  grid: "#1d1c1c",
  // grid: "#fff"
  liveCell: "yellow",
  deadCell: "#333"
};

function drawRect(ctx, x, y, w, h, backgroundColor, borderColor) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  if (borderColor) {
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fill();
  }
}

function prepareCanvas(ctx, canvas, width, height) {
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = colors.liveCell;
  ctx.lineWidth = 1;
  canvas.width = width;
  canvas.height = height;
}

function drawPoint(
  ctx: any,
  cell: Cell,
  options: {
    cellWidth: number;
    cellHeight: number;
    offsetX: number;
    offsetY: number;
    height: number;
    width: number;
  }
) {
  const { cellWidth, cellHeight, offsetX, offsetY, height, width } = options;
  const { x, y, value } = cell;
  const left = x * cellWidth + offsetX;
  const top = y * cellHeight + offsetY;
  if (left > -cellWidth && top >= -cellHeight && left < width && top < height) {
    const background = value ? colors.liveCell : colors.deadCell;
    drawRect(ctx, left, top, cellWidth, cellHeight, background, colors.grid);
  }
}

type Cell = { x: number; y: number; value: boolean; index: number };
function makeCell(value: boolean, index: number, cols: number): Cell {
  const { x, y } = ca.index2point(cols, index);
  return { x, y, value, index };
}

const CanvasWrapperStyle = { width: "100%", height: "100%" };

function getRealMouseCoords(canvas, event) {
  return relMouseCoords.call(canvas, event);
}

function getCellIndexFromClick(
  e,
  canvas,
  { offsetX, offsetY, cellWidth, cellHeight, cols }
) {
  const { x, y } = getRealMouseCoords(canvas, e);
  const realX = x - offsetX;
  const realY = y - offsetY;
  const col = Math.ceil(realX / cellWidth) - 1;
  const row = Math.ceil(realY / cellHeight) - 1;
  console.log("coords x, y, row, col", x, y, row, col);
  return ca.point2index(cols, [row, col]);
}

const from = (n, fn = (_, i) => i) => Array.from({ length: n }, fn);

const makeMatrix = (cols: number) =>
  from(cols * cols, (_, index) => {
    return makeCell(false, index, cols);
  });

const gtZero = val => (val < 1 ? 1 : val);

const makeCellSiblingsMap = (cols: number, matrix: Cell[]) => {
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

interface IGameProps {
  cols: number;
  viewport?: IGameViewport;
}
interface IViewportTranslation {
  x: number;
  y: number;
}
interface IGameViewport {
  width: number;
  height: number;
  scale: number;
  translation: IViewportTranslation;
}
interface IGame {
  props: IGameProps;
  matrix: Cell[];
  matrixBuffer: Cell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  canvasRef: { current: HTMLCanvasElement };
  ctx: CanvasRenderingContext2D;
  generation: number;
  updateTimeout: number;
  update(): void;
  toggleCell(index: number): void;
  draw(): void;
  reset(): void;
  swap(): void;
}
const calcScaledCellWidth = (width, height, cols, scale) => {
  const cellWidth = Math.min(width, height) / cols;
  return cellWidth * scale;
};
class Game implements IGame {
  props: IGameProps;
  matrix: Cell[];
  matrixBuffer: Cell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  generation: number;
  updateTimeout: number;
  canvasRef: { current: HTMLCanvasElement };

  constructor(props: IGameProps, canvasRef: { current: HTMLCanvasElement }) {
    this.generation = 0;
    this.ctx = canvasRef.current && canvasRef.current.getContext("2d");
    this.canvasRef = canvasRef;
    this.props = props;
    this.matrix = [];
    this.matrixBuffer = [];
    this.siblingsMap = [];
    this.viewport = props.viewport;
    this.reset();
  }

  reset = () => {
    this.matrix = makeMatrix(this.props.cols);
    this.matrixBuffer = makeMatrix(this.props.cols);
    this.siblingsMap = makeCellSiblingsMap(this.props.cols, this.matrix);
    this.generation = 0;
  };
  swap = () => {
    const tmp = this.matrix;
    this.matrix = this.matrixBuffer;
    this.matrixBuffer = tmp;
  };
  toggleCell = (index: number) => {
    this.matrix[index].value = !this.matrix[index].value;
  };
  start = () => {
    const rate = 100;
    let lastTimestamp = Date.now();
    const upd = () => {
      const currentTimestamp = Date.now();
      const diff = currentTimestamp - lastTimestamp;
      let afterTimestamp = Date.now();
      if (diff >= rate) {
        this.update();
        lastTimestamp = currentTimestamp;
        afterTimestamp = Date.now();
        console.log("took", afterTimestamp - currentTimestamp);
      }
      this.updateTimeout = setTimeout(
        upd,
        rate - (afterTimestamp - currentTimestamp)
      );
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
      matrixBuffer[i].value = result;
    });
    // this.matrix = buffer;
    this.swap();
  };

  draw = () => {
    if (!this.ctx && !this.canvasRef.current) {
      return;
    }
    if (!this.ctx && this.canvasRef.current) {
      this.ctx = this.canvasRef.current.getContext("2d");
    }
    const { cols } = this.props;
    const {
      width,
      height,
      scale,
      translation: { x: offsetX, y: offsetY }
    } = this.viewport;
    const cellWidth = calcScaledCellWidth(width, height, cols, scale);
    prepareCanvas(this.ctx, this.canvasRef.current, width, height);
    this.matrix.forEach((cell: Cell) => {
      const left = cell.x * cellWidth + offsetX;
      const top = cell.y * cellWidth + offsetY;
      if (
        left > -cellWidth &&
        top >= -cellWidth &&
        left < width &&
        top < height
      ) {
        drawPoint(this.ctx, cell, {
          cellWidth,
          cellHeight: cellWidth,
          offsetX,
          offsetY,
          height,
          width
        });
      }
    });
  };
}

function GameComponent({
  cols,
  width,
  height,
  translation,
  scale,
  running,
  onInit
}) {
  const canvasRef = React.useRef();
  const game = React.useMemo(() => {
    console.log(
      "translation, scale, width, height",
      translation,
      scale,
      width,
      height
    );
    return new Game(
      {
        cols,
        viewport: { translation, scale, width, height }
      },
      canvasRef
    );
  }, []);

  React.useEffect(() => onInit(game), [game]);

  React.useEffect(() => {
    if (!game) {
      return;
    }
    game.viewport.height = height;
    game.viewport.width = width;
    game.viewport.scale = scale;
  }, [translation, scale, height, width, game]);

  React.useEffect(() => {
    game && game.draw();
  }, [game]);

  React.useEffect(() => {
    if (!game) {
      return;
    }
    const rate = 30;
    const frameRateX = 1000 / rate;
    let last = Date.now();
    let index = null;

    function draw() {
      const timestamp = Date.now();
      const progress = timestamp - last;
      if (progress >= frameRateX) {
        last = timestamp;
        game.draw();
      }
      index = window.requestAnimationFrame(draw);
    }
    window.requestAnimationFrame(draw);
    return () => {
      console.log("cancel drawing loop");
      window.cancelAnimationFrame(index);
    };
  }, [game]);
  console.log("running", running);

  const onClick = React.useCallback(
    e => {
      if (!game) {
        return;
      }
      // const cellWidth = Math.min(width, height) / cols;
      console.log("width, height, cols, scale", width, height, cols, scale);
      const cellWidth = calcScaledCellWidth(width, height, cols, scale);
      const cellIndex = getCellIndexFromClick(e, canvasRef.current, {
        offsetX: game.viewport.translation.x,
        offsetY: game.viewport.translation.y,
        cellWidth,
        cellHeight: cellWidth,
        cols
      });
      game.toggleCell(cellIndex);
    },
    [width, height, cols, scale, game]
  );
  return (
    <div style={CanvasWrapperStyle}>
      <canvas ref={canvasRef} onClick={onClick} />
    </div>
  );
}

function App() {
  const playgroundRef = React.useRef();
  const [running, setRunning] = React.useState(false);
  const [game, setGame] = React.useState();
  const [cols, setCols] = React.useState(80);
  const onLongTap = e => {};

  const resetMap = () => {
    game && game.reset();
  };

  React.useEffect(() => {
    if (game) {
      if (running) {
        game.start();
      } else {
        game.stop();
      }
    }
  }, [running, game]);

  const width =
    (playgroundRef.current && playgroundRef.current.offsetWidth) || 0;
  const height =
    (playgroundRef.current && playgroundRef.current.offsetHeight) || 0;

  return (
    <div className="App">
      <div className="Controls">
        <button onClick={() => game.update()}>+1</button>
        <button
          onClick={() => {
            setRunning(!running);
          }}
        >
          {running ? "stop" : "start"}
        </button>
        <button onClick={resetMap}>Reset map</button>
        <button
          onTouchStart={e => {
            console.log("click");
            window.location.reload();
          }}
          onClick={e => {
            console.log("click");
            window.location.reload();
          }}
        >
          Reload
        </button>
        <label>
          <input
            type="range"
            min={10}
            max={200}
            step={10}
            value={cols}
            onChange={e => {
              setRunning(false);
              resetMap();
              setCols(gtZero(+e.target.value));
            }}
          />
          {cols} cols
        </label>
      </div>
      <div
        className="Playground noselect"
        ref={playgroundRef}
        unselectable="on"
      >
        <Playground
          onLongTap={onLongTap}
          minScale={Math.min(width, height) / (cols * 10)}
          width={width}
          height={height}
        >
          {({ scale, translation }) => {
            if (game) {
              console.log("game, scale, translation", game, scale, translation);
              game.viewport.translation = translation;
              game.viewport.scale = scale;
              game.viewport.width = width;
              game.viewport.height = height;
            }
            return (
              <GameComponent
                onInit={setGame}
                running={running}
                cols={cols}
                scale={scale}
                translation={translation}
                width={width}
                height={height}
              />
            );
          }}
        </Playground>
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
