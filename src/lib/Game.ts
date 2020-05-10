import React from "react";
import * as ca from "../ca";
import { Colors } from "../design/palette";
import * as config from "../config";

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

function drawCell(
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
      cell.isAlive ? x + k : x + k,
      cell.isAlive ? y + k : y + k,
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
  isAlive: boolean;
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
  return { x, y, isAlive: value, index, updated: true, age };
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

interface IGameParams {
  cols: number;
  speed: number;
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
  wallCell: string;
}

interface IGame {
  params: IGameParams;
  matrix: ICell[];
  matrixBuffer: ICell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
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

interface IGameState {
  cols: number;
  score: number;
  steps: number;
  speed: number;
  currentStep: number;
  matrix: ICell[];
}
export class Game implements IGame {
  matrix: ICell[];
  matrixBuffer: ICell[];
  siblingsMap: number[][];
  viewport: IGameViewport;
  generation: number;
  updateTimeout: any;
  clean: boolean;
  colors: IGameColors = {
    liveCell: Colors.AliveCell,
    oldCell: Colors.OldCell,
    veryOldCell: Colors.VeryOldCell,
    superOldCell: Colors.SuperOldCell,
    deadCell: Colors.DeadCell,
    wallCell: Colors.Background,
  };
  _gameStateChangeCallbacks: GameStateChangeCallback[] = [];
  score: number = 0;
  scoreVelocity: number = 0;
  steps: number = config.startTogglePoints;
  currentStep: number = 0;
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
  private ctx: CanvasRenderingContext2D | null;

  constructor(
    public params: IGameParams,
    protected canvasRef: React.MutableRefObject<HTMLCanvasElement | null>,
    protected playgroundRef: React.MutableRefObject<HTMLElement | null>
  ) {
    this.generation = 0;
    this.ctx = null;
    if (canvasRef.current) {
      this.ctx = canvasRef.current.getContext("2d", {
        alpha: ENABLE_CANVAS_ALPHA,
      });
    }
    this.matrix = [];
    this.matrixBuffer = [];
    this.siblingsMap = [];
    this.viewport = params.viewport;
    this.clean = false;
    this.reset();
    window.addEventListener("unload", () => this.persist());
  }

  reset = () => {
    this.matrix = makeMatrix(this.params.cols);
    this.matrixBuffer = makeMatrix(this.params.cols);
    this.siblingsMap = makeCellSiblingsMap(this.params.cols, this.matrix);
    this.generation = 0;
    this.clean = false;
    this.score = 0;
    this.scoreVelocity = 0;
    this.steps = config.startTogglePoints;
    this.currentStep = 0;
  };

  static restore(): IGameState | null {
    const str = localStorage.getItem("persisted_game");
    if (str) {
      try {
        const [cols, score, steps, currentStep, ...arr] = JSON.parse(str);
        return {
          cols,
          score,
          steps: steps === -1 ? Infinity : steps,
          speed: 1,
          currentStep,
          matrix: arr.map(([index, isAlive, age]: [number, number, number]) =>
            makeCell(isAlive === 1, index, cols, age)
          ),
        };
      } catch (error) {
        localStorage.removeItem("persisted_game");
      }
    }
    return null;
  }
  serialize() {
    const arr = [
      this.params.cols,
      this.score,
      isFinite(this.steps) ? this.steps : -1,
      this.currentStep,
      ...this.matrix.map((cell) => [
        cell.index,
        cell.isAlive ? 1 : 0,
        cell.age,
      ]),
    ];
    return JSON.stringify(arr);
  }
  persist() {
    const matrix_str = this.serialize();
    localStorage.setItem("persisted_game", matrix_str);
  }

  setState = (state: IGameState): void => {
    this.matrix = state.matrix.map((c) => ({ ...c }));
    this.matrixBuffer = state.matrix.map((c) => ({ ...c }));
    this.score = state.score;
    this.steps = state.steps;
    this.currentStep = state.currentStep;
  };
  setSpeed = (speed: number): void => {
    this.params.speed = speed;
  };
  setViewport(viewport: IGameViewportUpdate) {
    this.viewport = { ...this.viewport, ...viewport };
    this.clean = false;
  }
  setCols(cols: number) {
    if (this.params.cols !== cols) {
      this.params.cols = cols;
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

  toggleCell = (index: number) => {
    if (this.steps > 0) {
      this.steps -= 1;
      this.matrix[index].isAlive = !this.matrix[index].isAlive;
      this.matrixBuffer[index].isAlive = this.matrix[index].isAlive;
      this.clean = false;
    }
  };
  start = () => {
    let lastTimestamp = Date.now();
    const updateCallback = () => {
      const updateStepInterval = 100 / this.params.speed;
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

  swap = () => {
    const tmp = this.matrix;
    this.matrix = this.matrixBuffer;
    this.matrixBuffer = tmp;
  };
  update = (elapsedTime: number) => {
    const { matrix, matrixBuffer, siblingsMap } = this;
    let score = 0;
    matrix.forEach((cell, i) => {
      const isWallCell = this.isCellWall(cell);
      const sum = this.getSiblingsSum(siblingsMap[i]);
      const isNewAlive = this.getCellAlive(cell, sum) || isWallCell;

      const bufferCell = matrixBuffer[i];
      if (isNewAlive) {
        bufferCell.age = cell.isAlive ? cell.age + 1 : 1;
      } else {
        switch (true) {
          case !cell.isAlive && cell.age < 0 && cell.age > -6:
            bufferCell.age = cell.age - 1;
            break;
          case cell.isAlive:
            bufferCell.age = -1;
            break;
          default:
            bufferCell.age = 0;
        }
        // bufferCell.age = cell.age < -2 ? 0 : cell.isAlive ? -1 : cell.age - 1;
      }
      bufferCell.isAlive = isNewAlive;
      bufferCell.updated =
        cell.isAlive !== bufferCell.isAlive || cell.age !== bufferCell.age;

      if (cell.isAlive !== bufferCell.isAlive && this.clean) {
        this.clean = false;
      }
      if (cell.age > 0) {
        score += Math.floor(16 / cell.age); // Math.floor(((16 / cell.age) * elapsedTime) / 1000);
      }
    });
    const currentLevel = Math.floor(this.score / 10000);
    const newLevel = Math.floor((this.score + score) / 10000);
    this.steps += newLevel - currentLevel;
    this.scoreVelocity = score;
    this.score += score;
    this.currentStep += 1;

    this.swap();
  };

  getSiblingsSum = (siblingsIndexes: number[]) => {
    return siblingsIndexes.reduce((total, siblingIndex) => {
      const sibling = this.matrix[siblingIndex];
      const isSiblingCellWall = this.isCellWall(sibling);
      if (isSiblingCellWall || sibling.isAlive) {
        return total + 1;
      }
      return total;
    }, 0);
  };

  isCellWall = (cell: ICell): boolean =>
    cell.isAlive && cell.age > 12 && cell.age < 256;

  getCellAlive = (cell: ICell, sum: number): boolean => {
    if (cell.isAlive && sum > 1 && sum < 4) {
      return true;
    }
    if (sum === 3) {
      return true;
    }
    return false;
  };
  getCellColor = (cell: ICell) => {
    if (!cell.isAlive) {
      if (cell.age < 0) {
        return ["#151515", "#171717", "#191919", '#1b1b1b', '#1d1d1d', "#1e1e1e"][-cell.age % 6];
      }
      return this.colors.deadCell;
    }
    switch (true) {
      case this.isCellWall(cell):
        return this.colors.wallCell;
      case cell.age < 0:
        return "#000000";
      case cell.age > 16:
        return this.colors.superOldCell;
      case cell.age > 8:
        return this.colors.veryOldCell;
      case cell.age > 2:
        return this.colors.oldCell;
      default:
        return this.colors.liveCell;
    }
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
  getCanvasCtx = () => {
    if (this.ctx) {
      return this.ctx;
    }
    if (!this.ctx && this.canvasRef.current) {
      this.ctx = this.canvasRef.current.getContext("2d", {
        alpha: ENABLE_CANVAS_ALPHA,
      });
    }
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
    const cols = this.params.cols;
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
          const color = this.getCellColor(cell);
          drawCell(this.ctx, cell, x, y, this.options, color, k);
        } else {
          // debugger;
        }
      }
    }

    this.clean = true;
  };
}
