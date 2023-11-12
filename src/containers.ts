export type Tree<T> = T | Node<T>;
export type Node<T> = { left: Tree<T>; right: Tree<T> };

export function tree<T>(...xs: Tree<T>[]): Tree<T> {
  if (xs.length == 1) {
    return xs[0];
  }
  const [left, ...rest] = xs;
  return { left, right: tree(...rest) };
}

export function isNode<T>(t: Tree<T>): t is Node<T> {
  return t instanceof Object && "left" in t && "right" in t;
}

export function fmap<T, U>(f: (t: T) => U, t: Tree<T>): Tree<U> {
  if (isNode(t)) {
    return {
      left: fmap(f, t.left),
      right: fmap(f, t.right),
    };
  } else {
    return f(t);
  }
}

export function reduce<T>(f: (x: T, y: T) => T, t: Tree<T>): T {
  if (isNode(t)) {
    return f(reduce(f, t.left), reduce(f, t.right));
  } else {
    return t;
  }
}

export function zip<T, U>(l: Tree<T>, r: Tree<U>): Tree<[T, U]> {
  if (isNode(l) && isNode(r)) {
    return {
      left: zip(l.left, r.left),
      right: zip(l.right, r.right),
    };
  } else if (!isNode(l) && !isNode(r)) {
    return [l, r];
  } else {
    throw new Error(
      `Zipping a leaf with a node. l=${JSON.stringify(l)} r=${JSON.stringify(
        r,
      )}`,
    );
  }
}
