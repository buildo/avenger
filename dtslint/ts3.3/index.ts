import { TaskEither } from 'fp-ts/lib/TaskEither';
import { query, compose, product, queryShallow } from '../../src/Query';
import { Strategy, available, expire } from '../../src/Strategy';
import { param } from '../../src/DSL';
import { observeShallow } from '../../src/observe';

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

// $ExpectType Product<{ b?: undefined; } & { a: string; }, string, { a: number; b: number; }>
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
// $ExpectType Composition<{ token?: undefined; } & { postId: number; posts: { token?: undefined; } & { limit: number; }; }, void | "invalid token" | "not found", PostWithTags>
const postWithTags = compose(
  product({ token, postId, posts }),
  addTags
);
