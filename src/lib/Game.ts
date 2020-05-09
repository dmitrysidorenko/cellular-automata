import React from "react";
import * as ca from "../ca";
import { Colors } from "../design/palette";

declare global {
  interface Window {
    Colors: Colors;
  }
}
window.Colors = Colors;

const colors = {
  grid: Colors.Background,
  deadCell: Colors.DeadCell,
  liveCell: Colors.Primary,
  startBtn: Colors.Primary,
  stopBtn: Colors.Danger,
};

const ENABLE_CANVAS_ALPHA = false;

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
    //ctx.strokeStyle = borderColor;
    //ctx.stroke();
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
  canvas.width = width;
  canvas.height = height;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = colors.grid;
  ctx.fillStyle = colors.liveCell;
  ctx.lineWidth = 4;
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

const from = (n: number, fn = (_: any, i: number): any => i): any[] =>
  Array.from({ length: n }, fn);

const makeMatrix = (cols: number) =>
  from(cols * cols, (_: any, index: number) => {
    return makeCell(false, index, cols);
  });

const makeCellSiblingsMap = (cols: number, matrix: ICell[]) => {
  return matrix.map((cell) => {
    const { x, y } = cell;
    return [
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, -1),
        ca.getLoopCoord(cols, x, -1),
      ]),
      ca.point2index(cols, [y, ca.getLoopCoord(cols, x, -1)]),
      ca.point2index(cols, [ca.getLoopCoord(cols, y, -1), x]),
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, +1),
        ca.getLoopCoord(cols, x, +1),
      ]),
      ca.point2index(cols, [y, ca.getLoopCoord(cols, x, +1)]),
      ca.point2index(cols, [ca.getLoopCoord(cols, y, +1), x]),
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, -1),
        ca.getLoopCoord(cols, x, +1),
      ]),
      ca.point2index(cols, [
        ca.getLoopCoord(cols, y, +1),
        ca.getLoopCoord(cols, x, -1),
      ]),
    ].filter((v) => v !== null);
  });
};

interface IGameProps {
  cols: number;
  viewport: IGameViewport;
}
export interface IViewportTranslation {
  x: number;
  y: number;
}
interface IGameViewport {
  scale: number;
  translation: IViewportTranslation;
}
interface IGameViewportUpdate {
  width?: number;
  height?: number;
  scale?: number;
  translation?: IViewportTranslation;
}

interface IGameColors {
  liveCell: string;
  deadCell: string;
  oldCell: string;
  veryOldCell: string;
  superOldCell: string;
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
  updateTimeout: any;
  colors: IGameColors;
  update(elapsedTime: number): void;
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
  updateTimeout: any;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  playgroundRef: React.MutableRefObject<HTMLElement | null>;
  clean: boolean;
  colors: IGameColors = {
    liveCell: Colors.AliveCell,
    oldCell: Colors.OldCell,
    veryOldCell: Colors.VeryOldCell,
    superOldCell: Colors.SuperOldCell,
    deadCell: Colors.DeadCell,
  };
  _gameStateChangeCallbacks: GameStateChangeCallback[] = [];
  score: number = 0;
  scoreVelocity: number = 0;
  constructor(
    props: IGameProps,
    canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    playgroundRef: React.MutableRefObject<HTMLElement | null>
  ) {
    this.generation = 0;
    this.ctx = null;
    if (canvasRef.current) {
      this.ctx = canvasRef.current.getContext("2d", {
        alpha: ENABLE_CANVAS_ALPHA,
      });
    }
    this.canvasRef = canvasRef;
    this.playgroundRef = playgroundRef;
    this.props = props;
    this.matrix = [];
    this.matrixBuffer = [];
    this.siblingsMap = [];
    this.viewport = props.viewport;
    this.clean = false;
    this.reset();
    window.addEventListener("unload", () => this.persist());
  }

  serialize() {
    const arr = [
      this.props.cols,
      this.score,
      ...this.matrix.map((cell) => [cell.index, cell.value ? 1 : 0, cell.age]),
    ];
    return JSON.stringify(arr);
  }
  static restore() {
    const str = localStorage.getItem("persisted_game");
    if (str) {
      try {
        const [cols, score, ...arr] = JSON.parse(str);
        return {
          cols,
          score,
          matrix: arr.map(([index, val, age]: [number, number, number]) =>
            makeCell(val === 1, index, cols, age)
          ),
        };
      } catch (error) {
        localStorage.removeItem("persisted_game");
      }
    }
    return null;
  }

  persist() {
    const matrix_str = this.serialize();
    localStorage.setItem("persisted_game", matrix_str);
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
    this.score = 0;
    this.scoreVelocity = 0;
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
    const updateCallback = () => {
      const currentTimestamp = Date.now();
      const elapsedTime = currentTimestamp - lastTimestamp;
      let afterTimestamp = Date.now();
      let shouldStop = false;
      if (elapsedTime >= updateStepInterval) {
        this.update(elapsedTime);
        if (this.clean) {
          shouldStop = true;
          const changes = {
            running: false,
          };
          this._gameStateChangeCallbacks.forEach((cb) => cb(changes));
        }
        lastTimestamp = currentTimestamp;
        afterTimestamp = Date.now();
      }
      if (!shouldStop) {
        this.updateTimeout = setTimeout(
          updateCallback,
          updateStepInterval - (afterTimestamp - currentTimestamp)
        );
      }
    };
    updateCallback();
  };
  stop = () => {
    clearTimeout(this.updateTimeout);
  };
  update = (elapsedTime: number) => {
    const { matrix, matrixBuffer, siblingsMap } = this;
    let score = 0;
    matrix.forEach((cell, i) => {
      const sum = siblingsMap[i].reduce(
        (total, siblingIndex) => total + (matrix[siblingIndex].value ? 1 : 0),
        0
      );
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
      if (cell.age) {
        score += Math.floor(16 / cell.age); // Math.floor(((16 / cell.age) * elapsedTime) / 1000);
      }
    });
    this.scoreVelocity = score * (elapsedTime / 1000);
    this.score = score;
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
    width: 0,
  };
  getWidth = () => {
    const width =
      (this.playgroundRef.current && this.playgroundRef.current.offsetWidth) ||
      0;
    return width;
  };
  getHeight = () => {
    const height =
      (this.playgroundRef.current && this.playgroundRef.current.offsetHeight) ||
      0;
    return height;
  };
  draw = () => {
    if (!this.ctx && !this.canvasRef.current) {
      return;
    }

    if (!this.ctx && this.canvasRef.current) {
      this.ctx = this.canvasRef.current.getContext("2d", {
        alpha: ENABLE_CANVAS_ALPHA,
      });
    }
    const cols = this.props.cols;
    const width = this.getWidth();
    const height = this.getHeight();
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

    this.clean = true;
  };
}
