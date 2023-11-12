import test from "ava";

import { fmap, reduce, zip, tree } from "./containers";

const numbers = tree(1, 2, 3);

test("fmap", (t) => {
  t.deepEqual(
    fmap((x) => x + 1, numbers),
    tree(2, 3, 4),
  );
});

test("reduce", (t) => {
  t.deepEqual(
    reduce((x, y) => x + y, numbers),
    6,
  );
});

test("zip", (t) => {
  const chars = tree("a", "b", "c");
  t.deepEqual(zip(numbers, chars), tree([1, "a"], [2, "b"], [3, "c"]));
});
