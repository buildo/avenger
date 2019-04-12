import { TaskEither } from 'fp-ts/lib/TaskEither';
import { query, compose, product } from '../../src/Query';
import { Strategy } from '../../src/Strategy';

declare const af: (input: string) => TaskEither<string, number>;
declare const as: Strategy<string, string, number>;
const a = query(af)(as); // $ExpectType CachedQuery<string, string, number>

declare const bf: () => TaskEither<string, number>;
declare const bs: Strategy<void, string, number>;
const b = query(bf)(bs); // $ExpectType CachedQuery<void, string, number>

declare const cf: (input: number) => TaskEither<string, boolean>;
declare const cs: Strategy<number, string, boolean>;
const c = query(cf)(cs); // $ExpectType CachedQuery<number, string, boolean>

declare const df: (input: number) => TaskEither<number, boolean>;
declare const ds: Strategy<number, number, boolean>;
const d = query(df)(ds); // $ExpectType CachedQuery<number, number, boolean>

declare const ef: (input: string) => TaskEither<number, boolean>;
declare const es: Strategy<string, number, boolean>;
const e = query(ef)(es); // $ExpectType CachedQuery<string, number, boolean>

// $ExpectType Composition<string, string, boolean>
const composeac = compose(
  a,
  c
);

// $ExpectType Composition<string, string | number, boolean>
const composead = compose(
  a,
  d
);

const composeae = compose(
  a,
  e // $ExpectError
);

// $expectType Composition<never, string, boolean>
const composebc = compose(
  b,
  c
);

// $ExpectType Product<{} & { a: string; c: number; }, string, { a: number; c: boolean; }>
const productac = product({ a, c });

// $ExpectType Product<{} & { a: string; c: number; e: string; }, string | number, { a: number; c: boolean; e: boolean; }>
const productace = product({ a, c, e });
