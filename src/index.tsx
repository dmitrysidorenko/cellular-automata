import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import * as ca from "./ca";
import { relMouseCoords } from "./utils";
import { Playground } from "./Playgraoud";
import "./styles.css";

const colors = {
  // grid: "#1d1c1c",
  // deadCell: "#555",
  grid: "#333",
  deadCell: "black",
  // grid: "#fff"
  liveCell: "#f9e000"
};

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
    ctx.strokeStyle = borderColor;
    ctx.stroke();
  }
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
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
  ctx.lineWidth = 1; //cellWidthScaled > 4 ? 1 : 0;
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
  }
) {
  const x = xi * options.cellWidth + options.offsetX;
  const y = yi * options.cellHeight + options.offsetY;
  if (
    x > -options.cellWidth &&
    y >= -options.cellHeight &&
    x < options.width &&
    y < options.height
  ) {
    const background = cell.value ? colors.liveCell : colors.deadCell;
    drawRect(
      ctx,
      x,
      y,
      options.cellWidth,
      options.cellHeight,
      background,
      colors.grid
    );
  }
}

interface ICell {
  x: number;
  y: number;
  value: boolean;
  index: number;
  updated: boolean;
}
function makeCell(value: boolean, index: number, cols: number): ICell {
  const { x, y } = ca.index2point(cols, index);
  return { x, y, value, index, updated: true };
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

interface IGameProps {
  cols: number;
  viewport: IGameViewport;
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
interface IGameViewportUpdate {
  width?: number;
  height?: number;
  scale?: number;
  translation?: IViewportTranslation;
}
interface IGame {
  props: IGameProps;
  matrix: ICell[];
  matrixBuffer: ICell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  ctx: CanvasRenderingContext2D | null;
  generation: number;
  updateTimeout: number;
  update(): void;
  toggleCell(index: number): void;
  draw(): void;
  reset(): void;
  swap(): void;
  setViewport(viewport: IGameViewportUpdate): void;
  setCols(cols: number): void;
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

class Game implements IGame {
  props: IGameProps;
  matrix: ICell[];
  matrixBuffer: ICell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  generation: number;
  updateTimeout: number;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  clean: boolean;

  constructor(
    props: IGameProps,
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>
  ) {
    this.generation = 0;
    this.ctx = null;
    if (canvasRef.current) {
      this.ctx = canvasRef.current.getContext("2d");
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
        // console.log("took", afterTimestamp - currentTimestamp);
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
      matrixBuffer[i].updated = cell.value !== result;

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
  draw = () => {
    if (this.clean) {
      return;
    }
    if (!this.ctx && !this.canvasRef.current) {
      return;
    }
    if (!this.ctx && this.canvasRef.current) {
      this.ctx = this.canvasRef.current.getContext("2d");
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
          drawPoint(this.ctx, cell, x, y, this.options);
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
  running: boolean;
  onInit: Function;
};
function GameComponent({
  cols,
  width,
  height,
  translation,
  scale,
  running,
  onInit
}: GameComponentProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const game = React.useMemo(() => {
    // console.log(
    //   "translation, scale, width, height",
    //   translation,
    //   scale,
    //   width,
    //   height
    // );
    return new Game(
      {
        cols,
        viewport: { translation, scale, width, height }
      },
      canvasRef
    );
  }, []);

  useEffect(() => onInit(game), [game]);
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
      setTimeout(() => {
        index = window.requestAnimationFrame(draw);
      }, 0);
    }
    window.requestAnimationFrame(draw);
    return () => {
      window.cancelAnimationFrame(index);
    };
  }, [game]);

  const onClick = React.useCallback(
    e => {
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
    },
    [width, height, cols, scale, game]
  );
  return (
    <div style={CanvasWrapperStyle}>
      <canvas ref={canvasRef} onClick={onClick} />
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

function App() {
  const playgroundRef = React.useRef<HTMLDivElement>(null);
  const [running, setRunning] = React.useState(false);
  const [game, setGame] = React.useState();
  const [cols, setCols] = React.useState(80);
  const onLongTap = (e: React.SyntheticEvent) => {};

  const resetMap = (e: React.SyntheticEvent) => {
    game && game.reset();
    e && e.stopPropagation && e.stopPropagation();
    e && e.preventDefault && e.preventDefault();
  };

  useEffect(() => {
    if (game) {
      if (running) {
        game.start();
      } else {
        game.stop();
      }
    }
  }, [running, game]);

  useWindowResize();

  const width =
    (playgroundRef.current && playgroundRef.current.offsetWidth) || 0;
  const height =
    (playgroundRef.current && playgroundRef.current.offsetHeight) || 0;

  return (
    <div className="App">
      <div className="Controls">
        <button
          onClick={e => {
            game.update();
            e && e.stopPropagation && e.stopPropagation();
            e && e.preventDefault && e.preventDefault();
          }}
        >
          +1
        </button>
        <button
          onClick={e => {
            setRunning(!running);
            e && e.stopPropagation && e.stopPropagation();
            e && e.preventDefault && e.preventDefault();
          }}
        >
          {running ? "stop" : "start"}
        </button>
        <button onClick={resetMap}>Reset map</button>
        <button
          onTouchStart={e => {
            // console.log("click");
            window.location.reload();
          }}
          onClick={e => {
            // console.log("click");
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
              resetMap(e);
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
          minScale={0.75}
          width={width}
          height={height}
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
