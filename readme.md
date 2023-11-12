# System typów

Opis systemu typów, będącego uproszczoną wersją
[Hindley Millner](https://en.wikipedia.org/wiki/Hindley%E2%80%93Milner_type_system).

Główną różnicą jest fakt, że unifikacja nie wpływa bezpośrednio na
środowiska unifikowanych typów, a komunikacja między środowiskami sprowadza się do wyznaczania
różnic między stronami i aplikowania ich wewnątrz każdego ze środowisk.

W przeciwieństwie do standardowego HM, unifikacja nie powoduje powstania nowych zmiennych,
a jedynie dodawanie ograniczeń i połączeń do już istniejących.

## TLDR

```hs
unify f x =
  let x' = applyDiff x (calcDiff f x)
      f' = applyDiff f (calcDiff x' f)
   in f'
```

## Przykład unifikacji

Celem procesu unifikacji jest wyznaczenie najbardziej generycznego typu, który jest zgodny z oboma argumentami.
Wynik jest zatem co najmniej tak samo (lub, co częstsze, bardziej) specyficzny niż argumenty.

Przykładowo, wynikiem unifikacji typu `A` oraz zmiennej `x` jest typ `A` - bardziej specyficzny niż `x` i tak samo specyficzny jak `A`.

Rozważmy aplikację argumentu `inc` (inkrementacja - zwiększenie wartości całkowitej o 1) do funkcji wyższego rzędu `map` (aplikacja funkcji do każdego elementu listy).

```
map :: (a -> b) -> [a] -> [b]
inc :: Int -> Int
foo = map inc
foo :: ?
```

Dla kontekstu, wynikiem powinna być funkcja przyjmująca jako argument listę liczb całkowitych, zwracająca listę o tej samej długości, gdzie każdy element został zwiększony o 1.

```hs
> foo [1, 2, 3]
[2, 3, 4]
```

Aplikacja argumentu `x` do funkcji `f` sprowadza się do unifikacji `x` z typem oczekiwanego argumentu `f` (zwanego dalej `arg(f)`), przy jednoczesnej propagacji zmian w typie `arg(f)` do całej `f`.

```
arg(f) = a -> b
x = Int -> Int
```

Pierwszym krokiem jest przeniesienie specyficznych ograniczeń z `arg(f)` do `x`.

```
subst(arg(f), x) =
subst(a -> b, Int -> Int) =
subst(a, Int) + subst(b, Int) =
{}
```

W tym przypadku wynikiem jest pusty zbiór. Każdy z elementów `x` jest bardziej specyficzny niż `arg(f)`.

Następnym krokiem jest wykonanie odwrotnej operacji - przeniesienie ograniczeń z `x` do `arg(f)`.

```
subst(x, arg(f)) =
subst(Int -> Int, a -> b) =
subst(Int, a) + subst(Int, b) =
{ a: Int, b: Int }
```

Zbiór zmian nie jest pusty, więc należy je zaaplikować do `f`.

```
apply({ a: Int, b: Int}, f) =
apply({ a: Int, b: Int}, (a -> b) -> [a] -> [b]) =
(Int -> Int) -> [Int] -> [Int]
```

Wykonaliśmy aplikację argumentu do funkcji, więc możemy go usunąć z rezultatu.

```
ret((Int -> Int) -> [Int] -> [Int]) =
[Int] -> [Int]
```

## Ograniczenia

Podejście cechuje się dwoma ograniczeniami:

1. Aplikacja argumentów funkcji musi odbywać się zaczynając od argumentów specyficznych, kończąc na generycznych.

```hs
map :: (a -> b) -> [a] -> [b]
id :: a -> a

map id [1, 2, 3] -- błąd; pierwszy argument nie wiąże parametrów "a" i "b"

-- System działa poprawnie przy zmienionej definicji "map".
map' :: [a] -> (a -> b) -> [b]
map' [1, 2, 3] id -- [Int]; pierwsza aplikacja wiąże parametr "a", druga wiąże "b".
```

2. Zabronione są generyczne aplikacje

```hs
map :: (a -> b) -> [a] -> [b]
id :: a -> a

map id -- błąd; aplikacja nie wiąże typów "a" i "b"
```

W praktyce, w wielu przypadkach ograniczenia można obejść za pomocą wstępnego przetworzenia
danych, przed wywołaniem systemu typów. Przykładowo, ograniczenie 1. można spełnić zamieniając
kolejność argumentów zarówno w definicji funkcji jak i w miejscu aplikacji.

## Po co

Nie wiem.

Z teoretycznego punktu widzenia, to podejście jest prostsze niż HM, więc potencjalnie może być bardziej wydajne.
Choć, prawdę mówiąc, nie ma to wielkiego znaczenia.
