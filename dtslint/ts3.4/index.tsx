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
import { useQuery, WithQuery, declareQueries } from '../../src/react';
import * as React from 'react';
import { constNull } from 'fp-ts/lib/function';
import { QueryResult } from '../../src/QueryResult';
import { invalidate } from '../../src/invalidate';
import { ProductA } from '../../src/util';

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

interface Loc {
  pathname: string;
  search: Record<string, string>;
}
declare const location: ObservableQuery<void, void, Loc>;
interface View {
  view: string;
}
declare function locationToView(location: Loc): View;

// $ExpectType Composition<void, void, View>
const currentView = compose(
  location,
  queryStrict(
    location => taskEither.of<void, View>(locationToView(location)),
    refetch
  )
);

// $ExpectType Product<Pick<{} & { a: string; c: number; }, "a" | "c">, string, { a: number; c: boolean; }>
const productac = product({ a, c });

// $ExpectType Product<Pick<{} & { a: string; c: number; e: string; }, "a" | "c" | "e">, string | number, { a: number; c: boolean; e: boolean; }>
const productace = product({ a, c, e });

// $ExpectType Product<Pick<{ b?: undefined; } & { a: string; }, "a" | "b">, string, { a: number; b: number; }>
const productab = product({ a, b });
observeShallow(productab, { a: 'foo' });
// $ExpectError
observeShallow(productab, { b: 1, a: 'foo' });

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

useQuery(a); // $ExpectError
useQuery(b); // $ExpectType QueryResult<string, number>
useQuery(b, 3); // $ExpectError
useQuery(b, undefined); // $ExpectType QueryResult<string, number>

<WithQuery query={a} render={constNull} />; // $ExpectError
<WithQuery query={b} render={constNull} />;
<WithQuery query={b} input={3} render={constNull} />; // $ExpectError

declare const CA: React.ComponentType<{ a: QueryResult<string, number> }>;
const declareA = declareQueries({ a });
declareA.Props; // $ExpectType Pick<{ a: QueryResult<string, number>; }, "a">
const DCA = declareA(CA);
<DCA a="foo" />;
<DCA />; // $ExpectError
<DCA a={1} />; // $ExpectError

declare const CAB: React.ComponentType<{
  a: QueryResult<string, number>;
  b: QueryResult<string, number>;
}>;
const declareAB = declareQueries({ a, b });
declareAB.Props; // $ExpectType Pick<{ a: QueryResult<string, number>; b: QueryResult<string, number>; }, "a" | "b">
const DCAB = declareAB(CAB);
<DCAB a="foo" />;
<DCAB />; // $ExpectError
<DCAB b={1} />; // $ExpectError

invalidate({ a }, { a: 'foo' }); // $ExpectType TaskEither<string, { a: number; }>
invalidate({ a }, {}); // $ExpectError
invalidate({ a }); // $ExpectError
invalidate({ b }, {}); // $ExpectError
invalidate({ b }); // $ExpectType TaskEither<string, { b: number; }>
invalidate({ a, b }, {}); // $ExpectError
invalidate({ a, b }, { a: 'foo' }); // $ExpectType TaskEither<string, { a: number; b: number; }>

declare const caf: (input: string) => TaskEither<string, number>;
declare const cbf: (input: number) => TaskEither<string, number>;

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
  a: ObservableQuery<string, void, number>;
  b: ObservableQuery<void, void, number>;
};
type PA = ProductA<RA>; // $ExpectType Pick<{ b?: undefined; } & { a: string; }, "a" | "b">

// tslint:disable-next-line:interface-over-type-literal
type RB = {
  a: ObservableQuery<void, void, number>;
  b: ObservableQuery<void, void, number>;
};
type PB = ProductA<RB>; // $ExpectType void

// tslint:disable-next-line:interface-over-type-literal
type RC = {
  a: ObservableQuery<string, void, number>;
  b: ObservableQuery<number, void, number>;
};
type PC = ProductA<RC>; // $ExpectType Pick<{} & { a: string; b: number; }, "a" | "b">
