import { IVec2, Vec2 } from "./math";
import { point2index, getLoopCoord } from "../ca";

const makeCellSiblingsMap = (cols: number, position: IVec2) => {
  const { x, y } = position;
  return [
    point2index(cols, [getLoopCoord(cols, y, -1), getLoopCoord(cols, x, -1)]),
    point2index(cols, [y, getLoopCoord(cols, x, -1)]),
    point2index(cols, [getLoopCoord(cols, y, -1), x]),
    point2index(cols, [getLoopCoord(cols, y, +1), getLoopCoord(cols, x, +1)]),
    point2index(cols, [y, getLoopCoord(cols, x, +1)]),
    point2index(cols, [getLoopCoord(cols, y, +1), x]),
    point2index(cols, [getLoopCoord(cols, y, -1), getLoopCoord(cols, x, +1)]),
    point2index(cols, [getLoopCoord(cols, y, +1), getLoopCoord(cols, x, -1)]),
  ].filter((v) => v !== null);
};

export interface IGameObject {
  update(): void;
  draw(ctx: CanvasRenderingContext2D): void;
}

interface ICell {
  size: number;
  value: number;
  position: IVec2;
  siblings: number[];
}

export class World {
  cells: ICell[] = [];
  width: number = 0;
  height: number = 0;
  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = point2index(width, [x, y]);
        const position = Vec2(x, y);
        this.cells[index] = new CellGameObject(
          cellSize,
          position,
          makeCellSiblingsMap(width, position),
          this
        );
      }
    }
    this.cells.forEach((cell) => {
      cell.siblings = makeCellSiblingsMap(width, cell.position);
    });
  }
  getCell = (x: number, y: number): ICell | null => {
    const index = point2index(this.width, [x, y]);
    return this.getCellByIndex(index);
  };
  getCellByIndex = (index: number): ICell | null => {
    return this.cells[index] || null;
  };
}

export class CellGameObject implements IGameObject, ICell {
  size: number = 0;
  value: number = 0;
  position: IVec2 = { x: 0, y: 0 };
  siblings: number[] = [];
  constructor(
    size: number,
    position: IVec2,
    siblings: number[],
    protected world: World
  ) {
    this.size = size;
    this.position = position;
    this.siblings = siblings;
  }
  update = () => {
    const sum = this.siblings.reduce((total, siblingIndex) => {
      const v = this.world.getCellByIndex(siblingIndex);
      return total + (v && v.value ? 1 : 0);
    }, 0);
    // console.log("sum", sum);
    let result = false;
    if (this.value && sum > 1 && sum < 4) {
      result = true;
    } else {
      if (sum === 3) {
        result = true;
      }
    }
    // const bufferCell = matrixBuffer[i];
    // if (result) {
    //   bufferCell.age = this.value ? bufferCell.age + 1 : 1;
    // } else {
    //   bufferCell.age = 0;
    // }
    // bufferCell.value = result;
    // bufferCell.updated = this.value !== result;
  };
  draw = (ctx: CanvasRenderingContext2D)=> {}
}
