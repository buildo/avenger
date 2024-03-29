import * as TE from 'fp-ts/lib/TaskEither';
import * as Q from '../../src/Query';
import * as S from '../../src/Strategy';
import { param, command } from '../../src/DSL';
import { observeShallow } from '../../src/observe';
import {
  declareQueries,
  WithQueries,
  useQuery,
  useQueries
} from '../../src/react';
import * as React from 'react';
import * as QR from '../../src/QueryResult';
import { invalidate } from '../../src/invalidate';
import { ProductA } from '../../src/util';

declare const af: (input: string) => TE.TaskEither<string, number>;
declare const as: S.Strategy<string, string, number>;
const a = Q.query(af)(as); // $ExpectType CachedQuery<string, string, number>

declare const bf: () => TE.TaskEither<string, number>;
// tslint:disable-next-line:invalid-void
declare const bs: S.Strategy<void, string, number>;
const b = Q.query(bf)(bs); // $ExpectType CachedQuery<void, string, number>

declare const cf: (input: number) => TE.TaskEither<string, boolean>;
declare const cs: S.Strategy<number, string, boolean>;
const c = Q.query(cf)(cs); // $ExpectType CachedQuery<number, string, boolean>

declare const df: (input: number) => TE.TaskEither<number, boolean>;
declare const ds: S.Strategy<number, number, boolean>;
const d = Q.query(df)(ds); // $ExpectType CachedQuery<number, number, boolean>

declare const ef: (input: string) => TE.TaskEither<number, boolean>;
declare const es: S.Strategy<string, number, boolean>;
const e = Q.query(ef)(es); // $ExpectType CachedQuery<string, number, boolean>

// $ExpectType Composition<string, string, boolean>
const composeac = Q.compose(a, c);

// $ExpectType Composition<string, string | number, boolean>
const composead = Q.compose(a, d);

const composeae = Q.compose(
  a,
  e // $ExpectError
);

// $expectType Composition<never, string, boolean>
const composebc = Q.compose(b, c);

interface Loc {
  pathname: string;
  search: Record<string, string>;
}
// tslint:disable-next-line:invalid-void
declare const location: Q.ObservableQuery<void, void, Loc>;
interface View {
  view: string;
}
declare function locationToView(location: Loc): View;

// $ExpectType Composition<void, void, View>
const currentView = Q.compose(
  location,
  Q.queryStrict(
    // tslint:disable-next-line:invalid-void
    location => TE.taskEither.of<void, View>(locationToView(location)),
    S.refetch
  )
);

// $ExpectType Product<{} & { a: string; c: number; }, string, ProductP<{ a: CachedQuery<string, string, number>; c: CachedQuery<number, string, boolean>; }>>
const productac = Q.product({ a, c });

// tslint:disable-next-line:max-line-length
// $flaky-ExpectType Product<{} & { a: string; c: number; e: string; }, ProductL<{ a: CachedQuery<string, string, number>; c: CachedQuery<number, string, boolean>; e: CachedQuery<string, number, boolean>; }>, ProductP<{ a: CachedQuery<string, string, number>; c: CachedQuery<number, string, boolean>; e: CachedQuery<string, number, boolean>; }>>
const productace = Q.product({ a, c, e });

// $ExpectType Product<{ b?: undefined; } & { a: string; }, string, ProductP<{ a: CachedQuery<string, string, number>; b: CachedQuery<void, string, number>; }>>
const productab = Q.product({ a, b });
observeShallow(productab, { a: 'foo' });
// $ExpectError
observeShallow(productab, { b: 1, a: 'foo' });

// tslint:disable-next-line:invalid-void
declare function getToken(): TE.TaskEither<void, string>;
interface Post {
  id: number;
  content: { title: string; body: string };
}
type InvalidToken = 'invalid token';
type NotFound = 'not found';
declare function getPosts(input: {
  token: string;
  limit: number;
}): TE.TaskEither<InvalidToken, Post[]>;
type PostWithTags = Post & { tags: string[] };
const token = Q.queryShallow(getToken, S.available);
const postId = param<Post['id']>();
const limit = param<number>();
const posts = Q.compose(
  Q.product({ token, limit }),
  Q.queryShallow(getPosts, S.expire(2000))
);
declare function _addTags(input: {
  token: string;
  postId: number;
  posts: Post[];
}): TE.TaskEither<InvalidToken | NotFound, PostWithTags>;
const addTags = Q.queryShallow(_addTags, S.expire(2000));
// tslint:disable-next-line:max-line-length
// $flaky-ExpectType Composition<{ token?: undefined; } & { postId: number; posts: { token?: undefined; } & { limit: number; }; }, void | "invalid token" | "not found", PostWithTags>
const postWithTags = Q.compose(Q.product({ token, postId, posts }), addTags);

const declareA = declareQueries({ a });
declareA.InputProps; // $ExpectType { queries: {} & { a: string; }; }
declareA.Props; // $ExpectType QueryOutputProps<string, ProductP<{ a: CachedQuery<string, string, number>; }>>
declare const CA: React.ComponentType<{
  queries: QR.QueryResult<string, { a: number }>;
}>;
const DCA = declareA(CA);
<DCA queries={{ a: 'foo' }} />;
<DCA />; // $ExpectError
<DCA queries={{ a: 1 }} />; // $ExpectError
declare const CAA: React.ComponentType<{
  queries: QR.QueryResult<string, { a: number }>;
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
  queries: QR.QueryResult<string, { b: number }>;
}>;
const DCB = declareB(CB);
<DCB queries={undefined} />; // $ExpectError
<DCB />;
declare const CBB: React.ComponentType<{
  queries: QR.QueryResult<string, { b: number }>;
  foo: number;
}>;
const DCBB = declareB(CBB);
<DCBB queries={{}} foo={1} />; // $ExpectError
<DCBB queries={{}} />; // $ExpectError
<DCBB foo={1} />;

const declareAB = declareQueries({ a, b });
declareAB.InputProps; // $ExpectType { queries: { b?: undefined; } & { a: string; }; }
declareAB.Props; // $ExpectType QueryOutputProps<string, ProductP<{ a: CachedQuery<string, string, number>; b: CachedQuery<void, string, number>; }>>
declare const AB: React.ComponentType<{
  queries: QR.QueryResult<string, { a: number; b: number }>;
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

declare const caf: (input: string) => TE.TaskEither<string, number>;
declare const cbf: (input: number) => TE.TaskEither<string, number>;

const cmdcaf = command(caf); // $ExpectType (a: string, ia?: undefined) => TaskEither<string, number>
cmdcaf('foo'); // $ExpectType TaskEither<string, number>
command(caf, {}); // $ExpectError
const cmda = command(caf, { a }); // $ExpectType (a: string, ia: {} & { a: string; }) => TaskEither<string, number>
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
  a: Q.ObservableQuery<string, void, number>;
  // tslint:disable-next-line:invalid-void
  b: Q.ObservableQuery<void, void, number>;
};
type PA = ProductA<RA>; // $ExpectType { b?: undefined; } & { a: string; }

// tslint:disable-next-line:interface-over-type-literal
type RB = {
  // tslint:disable-next-line:invalid-void
  a: Q.ObservableQuery<void, void, number>;
  // tslint:disable-next-line:invalid-void
  b: Q.ObservableQuery<void, void, number>;
};
type PB = ProductA<RB>; // $ExpectType void

// tslint:disable-next-line:interface-over-type-literal
type RC = {
  // tslint:disable-next-line:invalid-void
  a: Q.ObservableQuery<string, void, number>;
  // tslint:disable-next-line:invalid-void
  b: Q.ObservableQuery<number, void, number>;
};
type PC = ProductA<RC>; // $ExpectType {} & { a: string; b: number; }

declare const q1: Q.ObservableQuery<{ a: string }, string, string>;
declare const q2: Q.ObservableQuery<{ b: number }, string, string>;
declare const q3: Q.ObservableQuery<void, string, string>;

<WithQueries
  queries={{ q1, q2 }}
  params={{ q: { a: 'ciao' }, q2: { b: 2 } }} // $ExpectError
  render={QR.fold(
    () => null,
    () => null,
    ({ q1, q2 }) => (
      <span>{`${q1}: ${q2}`}</span>
    )
  )}
/>;

<WithQueries
  queries={{ q1, q2 }}
  params={{ q1: { a: 2 }, q2: { b: 2 } }} // $ExpectError
  render={QR.fold(
    () => null,
    () => null,
    ({ q1, q2 }) => (
      <span>{`${q1}: ${q2}`}</span>
    )
  )}
/>;

<WithQueries
  queries={{ q2 }}
  params={{ q2: { b: 2 } }}
  render={QR.fold(
    () => null,
    () => null,
    (
      { q } // $ExpectError
    ) => (
      <span>{q}</span>
    )
  )}
/>;

<WithQueries
  queries={{ q3 }}
  params={{ q3: undefined }} // $ExpectError
  render={QR.fold(
    () => null,
    () => null,
    ({ q3 }) => (
      <span>{q3}</span>
    )
  )}
/>;

<WithQueries
  queries={{ q3, q4: q3 }}
  render={QR.fold(
    () => null,
    () => null,
    ({ q3, q4 }) => (
      <span>{`${q3}-${q4}`}</span>
    )
  )}
/>;

useQuery(a); // $ExpectError
useQuery(b); // $ExpectType QueryResult<string, number>
useQuery(b, 3); // $ExpectError
useQuery(b, undefined); // $ExpectType QueryResult<string, number>

useQueries({ a }); // $ExpectError
useQueries({ b }); // $ExpectType QueryResult<string, ProductP<{ b: CachedQuery<void, string, number>; }>>
useQueries({ b }, { b: 3 }); // $ExpectError
useQueries({ b }, undefined); // $ExpectType QueryResult<string, ProductP<{ b: CachedQuery<void, string, number>; }>>
