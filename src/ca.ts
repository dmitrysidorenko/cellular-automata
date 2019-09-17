export const point2index = (cols: number, cellCoords: [number, number]) => {
  const row = cellCoords[0];
  const col = cellCoords[1];
  console.assert(
    col + 1 <= cols,
    "col cannot be larger than cols  " + row + "::" + col
  );
  return cols * row + col;
};

export const index2point = (
  cols: number,
  index: number
): { x: number; y: number } => {
  return { y: Math.floor(index / cols), x: index % cols };
};

type Rule = { left: any; middle: any; right: any; result: any };
export const calcCell = (
  cols: number,
  rules: Rule[],
  map: { [key: string]: any },
  index: number
) => {
  const { y, x } = index2point(cols, index);
  console.assert(
    x + 1 <= cols,
    "col cannot be larger than cols :" + y + "," + x
  );
  console.assert(y > 0, "row must be > 0");
  // console.log("row, col", row, col);
  const siblings = {
    left: x === 0 ? null : map[point2index(cols, [y - 1, x - 1])],
    middle: y === 0 ? null : map[point2index(cols, [y - 1, x])],
    right: x + 1 >= cols ? null : map[point2index(cols, [y - 1, x + 1])]
  };
  // console.log("siblings", siblings);

  const rule2apply = rules.find(
    ({ left, middle, right }) =>
      !!siblings.left === left &&
      !!siblings.right === right &&
      !!siblings.middle === middle
  );
  // console.log("rule2apply", rule2apply);
  console.assert(
    !!rule2apply,
    "no rules satisfies! it means the rules set is not complete"
  );
  return rule2apply ? rule2apply.result : false;
};

export const createRule = (
  left = false,
  middle = false,
  right = false,
  result = false
) => ({
  left: !!left,
  middle: !!middle,
  right: !!right,
  result: !!result
});

export const validateRulesSet = (rules: Rule[]) => {
  const rulesAsStrings = rules.map(o => JSON.stringify(o));
  const asObject = rulesAsStrings.reduce(
    (acc, str) => ({ ...acc, [str]: true }),
    {}
  );
  const distinctRulesNumber = Object.keys(asObject).length;
  console.assert(
    rules.length === distinctRulesNumber,
    "all rules should be unique"
  );
};

export const getLoopCoord = (cols: number, x: number, kx: number) => {
  let nextX = x + kx;
  if (nextX < 0) {
    return cols + nextX;
  }
  if (nextX > cols - 1) {
    return nextX - cols;
  }
  return nextX;
};
