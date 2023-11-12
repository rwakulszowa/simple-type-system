import test from "ava";

import { TypPlus, apply, FT, formatFT, typ, typvar } from "./typesystem";
import { tree } from "./containers";

const testApply = test.macro({
  exec(t, fun: FT, args: FT[], expected: FT) {
    let ret = fun;
    for (const arg of args) {
      ret = apply(ret, arg);
    }
    t.deepEqual(ret, expected);
  },
  title(_providedTitle, fun: FT, args: FT[], expected: FT) {
    return `${formatFT(fun)} | ${args.map(formatFT).join(" | ")} == ${formatFT(
      expected,
    )}`;
  },
});

const a = typvar("a");
const b = typvar("b");
const num = typ("Num");
const seq = (t: TypPlus) => typ("Seq", [t]);
const add = tree(num, num, num);
const id = tree(a, a);
const map: FT = tree(seq(a), tree<TypPlus>(a, b), seq(b));
const fold: FT = tree<TypPlus>(a, seq(b), tree(a, b, a), a);

test(testApply, add, [num, num], num);
test(testApply, map, [seq(num), id], seq(num));
test(testApply, fold, [num, seq(num), add], num);
