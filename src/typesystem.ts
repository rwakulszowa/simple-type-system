import { Tree, fmap, zip, reduce, isNode } from "./containers";
import isEqual from "lodash/isEqual";

// Wszystkie dostępne typy.
export type TypPlus = Typ | AnyConstraint | TypVar;

// Typ zdefiniowany dla konkretnego problemu.
// Przykłady:
// - Number
// - String
export type Typ = {
  tag: string;
  params: TypPlus[];
};

// Bazowe, puste ograniczenie dla typu parametryzowanego.
export type AnyConstraint = "Any";

// Typ reprezentujący zmienną (parametr).
// Przykłady:
// - List<a> ("a" jest instancją `Variable`)
export type TypVar = { id: Var };

export function typ(tag: string, params: TypPlus[] = []): Typ {
  return { tag, params };
}

export function any(): AnyConstraint {
  return "Any";
}

export function typvar(id: Var): TypVar {
  return { id };
}

/**
 * Czytelna wersja `toString()`.
 */
export function format(t: TypPlus): string {
  if (isTyp(t)) {
    return `${t.tag} ${t.params.map(format).join(" ")}`;
  }
  if (isAnyConstraint(t)) {
    return t;
  }
  return t.id;
}

export function isTyp(t: TypPlus): t is Typ {
  return t instanceof Object && "tag" in t && "params" in t;
}

export function isAnyConstraint(t: TypPlus): t is AnyConstraint {
  return t === "Any";
}

export function isTypVar(t: TypPlus): t is TypVar {
  return t instanceof Object && "id" in t;
}

// Drzewo typów.
// Reprezentuje aplikację typów (wyrażenie).
export type FT = Tree<TypPlus>;

/**
 * Czytelna wersja `toString()`.
 */
export function formatFT(ft: FT): string {
  if (isNode(ft)) {
    const shouldWrap = isNode(ft.left);
    const maybeWrap = (s: string) => (shouldWrap ? `(${s})` : s);
    return `${maybeWrap(formatFT(ft.left))} -> ${formatFT(ft.right)}`;
  } else {
    return format(ft);
  }
}

export function arg(ft: FT): FT {
  if (!isNode(ft)) {
    throw new Error(`Called "arg" on a Leaf.`);
  }
  return ft.left;
}

export function ret(ft: FT): FT {
  if (!isNode(ft)) {
    throw new Error(`Called "ret" on a Leaf.`);
  }
  return ft.right;
}

// Zmienna w typie.
// Pozwala definiować parametryzowalne typy.
type Var = string;

// Podstawienie zmiennych na typy.
// Tworzona i aplikowana w procesie unifikacji.
type Subst = Map<Var, TypPlus>;

function emptySubst(): Subst {
  return new Map();
}

/**
 * Unifikacja dwóch typów.
 * Unifikacji zostaje poddany wynik `at(f)` i `x`. Zmiany propagowane
 * są do całego typu `f`.
 *
 * `at` jest funkcją wskazującą zbiór `f`, który należy poddać unifikacji.
 * Nie powinna dokonywać żadnych zmian w `f`.
 */
export function unify(at: (f: FT) => FT, f: FT, x: FT): FT {
  const f_ = at(f);
  const x_ = applySubst(x, calcSubst(f_, x));
  return applySubst(f, calcSubst(x_, f_));
}

export function apply(f: FT, x: FT): FT {
  return ret(unify(arg, f, x));
}

function replaceParams(f: (v: TypVar) => TypPlus, t: TypPlus): TypPlus {
  if (isTyp(t)) {
    return {
      ...t,
      params: t.params.map((v) => replaceParams(f, v)),
    };
  } else if (isAnyConstraint(t)) {
    return t;
  } else {
    return f(t);
  }
}

/**
 * Usuwa wszystkie zmienne z typu, zastępując je pustymi ograniczeniami.
 */
function stripParams(t: TypPlus): TypPlus {
  return replaceParams(() => "Any", t);
}

/**
 * Aplikuje podstawienie do drzewa typów.
 */
function applySubst(ft: FT, subst: Subst): FT {
  const replace = (v: TypVar) => subst.get(v.id) || v;
  return fmap((t) => replaceParams(replace, t), ft);
}

/**
 * Oblicza podstawienie wynikające z połączenia dwóch drzew typów.
 * Podstawienia wyznaczane są dla zmiennych lewego drzewa. Zmienne prawego
 * drzewa są ignorowane.
 *
 * Przykłady:
 * - calcSubst(x -> y, A -> B) = { x: A, y: B }
 * - calcSubst(A -> B, x -> y) = {}
 */
function calcSubst(l: FT, r: FT): Subst {
  const zipped = zip(l, r);
  const substsTree = fmap(([x, y]) => calcSubstTyp(x, y), zipped);
  return reduce(mergeSubst, substsTree);
}

/**
 * Oblicza podstawienie wynikające z połączenia dwóch typów.
 * Zob. `calcSubst`.
 */
function calcSubstTyp(l: TypPlus, r: TypPlus): Subst {
  // A, B.
  // Jeśli typy są zgodne, wywołuje rekurencyjnie.
  // W przeciwnym wypadku zwraca wyjątek.
  if (isTyp(l) && isTyp(r)) {
    return calcSubstConcreteTyp(l, r);
  }

  // Any.
  // Noop. Brak informacji do przekazania.
  //
  // TODO: ten przypadek raczej nie powinien występować w praktyce.
  // Monitorować częstość występowania i zwrócić błąd.
  if (isAnyConstraint(l) || isAnyConstraint(r)) {
    return emptySubst();
  }

  // a, *.
  // Noop - lewe zmienne nie są propagowane w prawo.
  if (isTypVar(l)) {
    return emptySubst();
  }

  // *, a.
  // Zmienna po prawej stronie. Kluczowy przypadek.
  if (isTypVar(r)) {
    const ret = emptySubst();
    ret.set(r.id, stripParams(l));
    return ret;
  }

  throw new Error(`Type mismatch. l=${l} r=${r}`);
}

/**
 * Oblicza podstawienie dla typów użytkownika.
 */
function calcSubstConcreteTyp(l: Typ, r: Typ): Subst {
  if (l.tag !== r.tag || l.params.length !== r.params.length) {
    throw new Error(`Type mismatch. l=${l} r=${r}`);
  }
  return mergeSubsts(
    l.params.map((lp, i) => {
      const rp = r.params[i];
      return calcSubstTyp(lp, rp);
    }),
  );
}

/**
 * Dodaje nową podmianę lub aktualizuje starą.
 */
function addSubst(subst: Subst, v: Var, typ: TypPlus) {
  const prev = subst.get(v);

  if (!prev) {
    subst.set(v, typ);
    return;
  }

  if (isEqual(prev, typ)) {
    return;
  }

  if (typ === "Any") {
    return;
  }

  if (prev === "Any") {
    subst.set(v, typ);
    return;
  }
}

/**
 * Łączy dwa zbiory podstawień.
 * W razie wykrycia konfliktu zwraca błąd.
 */
function mergeSubst(x: Subst, y: Subst) {
  for (const [k, v] of y.entries()) {
    addSubst(x, k, v);
  }
  return x;
}

/**
 * Łączy wiele zbiorów podstawień.
 * Argumenty są modyfikowane.
 */
function mergeSubsts(xs: Subst[]): Subst {
  const ret = emptySubst();
  for (const x of xs) {
    mergeSubst(ret, x);
  }
  return ret;
}
