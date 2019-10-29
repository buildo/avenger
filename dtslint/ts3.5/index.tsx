import { TaskEither, taskEither } from 'fp-ts/lib/TaskEither';
import {
  query,
  compose,
  product,
  queryShallow,
  ObservableQuery,
  queryStrict
} from '../../src/Query';
import { Strategy, available, expire, refetch } from '../../src/Strategy';
import { param, command } from '../../src/DSL';
import { observeShallow } from '../../src/observe';
import { declareQueries, WithQueries } from '../../src/react';
import * as React from 'react';
import { QueryResult } from '../../src/QueryResult';
import { invalidate } from '../../src/invalidate';
import { ProductA } from '../../src/util';

declare const af: (input: string) => TaskEither<string, number>;
declare const as: Strategy<string, string, number>;
const a = query(af)(as); // $ExpectType CachedQuery<string, string, number>

declare const bf: () => TaskEither<string, number>;
// tslint:disable-next-line:invalid-void
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

interface Loc {
  pathname: string;
  search: Record<string, string>;
}
// tslint:disable-next-line:invalid-void
declare const location: ObservableQuery<void, void, Loc>;
interface View {
  view: string;
}
declare function locationToView(location: Loc): View;

// $ExpectType Composition<void, void, View>
const currentView = compose(
  location,
  queryStrict(
    // tslint:disable-next-line:invalid-void
    location => taskEither.of<void, View>(locationToView(location)),
    refetch
  )
);

// $ExpectType Product<Pick<{} & { a: string; c: number; }, "a" | "c">, string, ProductP<{ a: CachedQuery<string, string, number>; c: CachedQuery<number, string, boolean>; }>>
const productac = product({ a, c });

// tslint:disable-next-line:max-line-length
// $ExpectType Product<Pick<{} & { a: string; c: number; e: string; }, "a" | "c" | "e">, string | number, ProductP<{ a: CachedQuery<string, string, number>; c: CachedQuery<number, string, boolean>; e: CachedQuery<string, number, boolean>; }>>
const productace = product({ a, c, e });

// $ExpectType Product<Pick<{ b?: undefined; } & { a: string; }, "a" | "b">, string, ProductP<{ a: CachedQuery<string, string, number>; b: CachedQuery<void, string, number>; }>>
const productab = product({ a, b });
observeShallow(productab, { a: 'foo' });
// $ExpectError
observeShallow(productab, { b: 1, a: 'foo' });

// tslint:disable-next-line:invalid-void
declare function getToken(): TaskEither<void, string>;
interface Post {
  id: number;
  content: { title: string; body: string };
}
type InvalidToken = 'invalid token';
type NotFound = 'not found';
declare function getPosts(input: {
  token: string;
  limit: number;
}): TaskEither<InvalidToken, Post[]>;
type PostWithTags = Post & { tags: string[] };
const token = queryShallow(getToken, available);
const postId = param<Post['id']>();
const limit = param<number>();
const posts = compose(
  product({ token, limit }),
  queryShallow(getPosts, expire(2000))
);
declare function _addTags(input: {
  token: string;
  postId: number;
  posts: Post[];
}): TaskEither<InvalidToken | NotFound, PostWithTags>;
const addTags = queryShallow(_addTags, expire(2000));
// tslint:disable-next-line:max-line-length
// $ExpectType Composition<Pick<{ token?: undefined; } & { postId: number; posts: Pick<{ token?: undefined; } & { limit: number; }, "token" | "limit">; }, "token" | "postId" | "posts">, void | "invalid token" | "not found", PostWithTags>
const postWithTags = compose(
  product({ token, postId, posts }),
  addTags
);

const declareA = declareQueries({ a });
declareA.InputProps; // $ExpectType { queries: Pick<{} & { a: string; }, "a">; }
declareA.Props; // $ExpectType QueryOutputProps<string, ProductP<{ a: CachedQuery<string, string, number>; }>>
declare const CA: React.ComponentType<{
  queries: QueryResult<string, { a: number }>;
}>;
const DCA = declareA(CA);
<DCA queries={{ a: 'foo' }} />;
<DCA />; // $ExpectError
<DCA queries={{ a: 1 }} />; // $ExpectError
declare const CAA: React.ComponentType<{
  queries: QueryResult<string, { a: number }>;
  foo: number;
}>;
const DCAA = declareA(CAA);
<DCAA queries={{ a: 'foo' }} foo={1} />;
<DCAA queries={{ a: 'foo' }} />; // $ExpectError
<DCAA foo={1} />; // $ExpectError
<DCAA queries={{ a: 1 }} foo={1} />; // $ExpectError

const declareB = declareQueries({ b });
declareB.InputProps; // $ExpectType {}
declareB.Props; // $ExpectType QueryOutputProps<string, ProductP<{ b: CachedQuery<void, string, number>; }>>
declare const CB: React.ComponentType<{
  queries: QueryResult<string, { b: number }>;
}>;
const DCB = declareB(CB);
<DCB queries={undefined} />; // $ExpectError
<DCB />;
declare const CBB: React.ComponentType<{
  queries: QueryResult<string, { b: number }>;
  foo: number;
}>;
const DCBB = declareB(CBB);
<DCBB queries={{}} foo={1} />; // $ExpectError
<DCBB queries={{}} />; // $ExpectError
<DCBB foo={1} />;

const declareAB = declareQueries({ a, b });
declareAB.InputProps; // $ExpectType { queries: Pick<{ b?: undefined; } & { a: string; }, "a" | "b">; }
declareAB.Props; // $ExpectType QueryOutputProps<string, ProductP<{ a: CachedQuery<string, string, number>; b: CachedQuery<void, string, number>; }>>
declare const AB: React.ComponentType<{
  queries: QueryResult<string, { a: number; b: number }>;
}>;
const DAB = declareAB(AB);
<DAB queries={{}} />; // $ExpectError
<DAB />; // $ExpectError
<DAB queries={{ a: 'foo' }} />;

invalidate({ a }, { a: 'foo' }); // $ExpectType TaskEither<string, ProductP<{ a: CachedQuery<string, string, number>; }>>
invalidate({ a }, {}); // $ExpectError
invalidate({ a }); // $ExpectError
invalidate({ b }, {}); // $ExpectError
invalidate({ b }); // $ExpectType TaskEither<string, ProductP<{ b: CachedQuery<void, string, number>; }>>
invalidate({ a, b }, {}); // $ExpectError
invalidate({ a, b }, { a: 'foo' }); // $ExpectType TaskEither<string, ProductP<{ a: CachedQuery<string, string, number>; b: CachedQuery<void, string, number>; }>>

declare const caf: (input: string) => TaskEither<string, number>;
declare const cbf: (input: number) => TaskEither<string, number>;

const cmdcaf = command(caf); // $ExpectType (a: string, ia?: undefined) => TaskEither<string, number>
cmdcaf('foo'); // $ExpectType TaskEither<string, number>
command(caf, {}); // $ExpectError
const cmda = command(caf, { a }); // $ExpectType (a: string, ia: Pick<{} & { a: string; }, "a">) => TaskEither<string, number>
cmda(1, { a: 'foo' }); // $ExpectError
cmda('foo', {}); // $ExpectError
cmda('foo'); // $ExpectError
cmda('foo', { a: 'foo' });
const cmdb = command(cbf, { b }); // $ExpectType (a: number, ia?: void | undefined) => TaskEither<string, number>
cmdb('foo', {}); // $ExpectError
cmdb('foo'); // $ExpectError
cmdb('foo', { b: 1 }); // $ExpectError
cmdb(1);

// tslint:disable-next-line:interface-over-type-literal
type RA = {
  // tslint:disable-next-line:invalid-void
  a: ObservableQuery<string, void, number>;
  // tslint:disable-next-line:invalid-void
  b: ObservableQuery<void, void, number>;
};
type PA = ProductA<RA>; // $ExpectType Pick<{ b?: undefined; } & { a: string; }, "a" | "b">

// tslint:disable-next-line:interface-over-type-literal
type RB = {
  // tslint:disable-next-line:invalid-void
  a: ObservableQuery<void, void, number>;
  // tslint:disable-next-line:invalid-void
  b: ObservableQuery<void, void, number>;
};
type PB = ProductA<RB>; // $ExpectType void

// tslint:disable-next-line:interface-over-type-literal
type RC = {
  // tslint:disable-next-line:invalid-void
  a: ObservableQuery<string, void, number>;
  // tslint:disable-next-line:invalid-void
  b: ObservableQuery<number, void, number>;
};
type PC = ProductA<RC>; // $ExpectType Pick<{} & { a: string; b: number; }, "a" | "b">

declare const q1: ObservableQuery<{ a: string }, string, string>;
declare const q2: ObservableQuery<{ b: number }, string, string>;
declare const q3: ObservableQuery<void, string, string>;

<WithQueries
  queries={{ q1, q2 }}
  params={{ q: { a: 'ciao' }, q2: { b: 2 } }} // $ExpectError
  render={q => {
    return q.fold(
      () => null,
      () => null,
      ({ q1, q2 }) => <span>{`${q1}: ${q2}`}</span>
    );
  }}
/>;

<WithQueries
  queries={{ q1, q2 }}
  params={{ q1: { a: 2 }, q2: { b: 2 } }} // $ExpectError
  render={q => {
    return q.fold(
      () => null,
      () => null,
      ({ q1, q2 }) => <span>{`${q1}: ${q2}`}</span>
    );
  }}
/>;

<WithQueries
  queries={{ q2 }}
  params={{ q2: { b: 2 } }}
  render={q => {
    return q.fold(() => null, () => null, ({ q }) => <span>{q}</span>); // $ExpectError
  }}
/>;

<WithQueries // $ExpectError
  queries={{ q3 }}
  params={{ q3: undefined }}
  render={q => {
    return q.fold(() => null, () => null, ({ q3 }) => <span>{q3}</span>);
  }}
/>;

<WithQueries
  queries={{ q3, q4: q3 }}
  render={q => {
    return q.fold(
      () => null,
      () => null,
      ({ q3, q4 }) => <span>{`${q3}-${q4}`}</span>
    );
  }}
/>;
