export interface IVec2 {
  x: number;
  y: number;
}

const Vec2 = (x = 0, y = 0): IVec2 => ({ x, y });

Vec2.sum = (v1: IVec2, v2: IVec2) => Vec2(v1.x + v2.x, v1.y + v2.y);
Vec2.diff = (v1: IVec2, v2: IVec2) => Vec2(v1.x - v2.x, v1.y - v2.y);
Vec2.mul = (v1: IVec2, n: number) => Vec2(v1.x + n, v1.y * n);

export { Vec2 };
