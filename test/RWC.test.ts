import * as TE from 'fp-ts/lib/TaskEither';
import * as A from 'fp-ts/lib/Array';
import {
  queryShallow,
  available,
  param,
  compose,
  product,
  expire
} from '../src';
import { observeShallow } from '../src/observe';
import { take, toArray } from 'rxjs/operators';
import * as O from 'fp-ts/lib/Option';
import { pipe } from 'fp-ts/lib/pipeable';

it('RWC', async () => {
  function getToken(): TE.TaskEither<void, string> {
    return TE.taskEither.of('token');
  }
  type Post = { id: number; content: { title: string; body: string } };
  type InvalidToken = 'invalid token';
  type NotFound = 'not found';
  function getPosts(
    token: string,
    limit: number
  ): TE.TaskEither<InvalidToken, Array<Post>> {
    return TE.taskEither.of(
      A.range(0, limit).map((_, index) => ({
        id: index,
        content: { title: String(index), body: token }
      }))
    );
  }
  function getTags(
    token: string,
    postId: Post['id']
  ): TE.TaskEither<InvalidToken | NotFound, Array<string>> {
    return TE.taskEither.of(
      A.range(0, postId - 1).map((_, index) => `${token}-${index}`)
    );
  }
  type PostWithTags = Post & { tags: Array<string> };
  const token = queryShallow(getToken, available);
  const postId = param<Post['id']>();
  const limit = param<number>();
  const posts = compose(
    product({ token, limit }),
    queryShallow(
      (input: { token: string; limit: number }) =>
        getPosts(input.token, input.limit),
      expire(2000)
    )
  );
  const addTags = queryShallow(
    (input: { token: string; postId: Post['id']; posts: Array<Post> }) =>
      pipe(
        input.posts,
        A.findFirst(p => p.id === input.postId),
        O.fold(
          () => TE.left<InvalidToken | NotFound, PostWithTags>('not found'),
          post =>
            pipe(
              getTags(input.token, post.id),
              TE.map(tags => ({ ...post, tags }))
            )
        )
      ),
    expire(2000)
  );
  const postWithTags = compose(product({ token, postId, posts }), addTags);

  requestAnimationFrame(() =>
    postWithTags.run({
      postId: 1,
      posts: { limit: 10 }
    })()
  );
  const results = await observeShallow(postWithTags, {
    postId: 3,
    posts: { limit: 10 }
  })
    .pipe(take(2), toArray())
    .toPromise();
  expect(results).toEqual([
    { _tag: 'Loading' },
    {
      _tag: 'Success',
      success: {
        content: {
          body: 'token',
          title: '3'
        },
        id: 3,
        tags: ['token-0', 'token-1', 'token-2']
      },
      loading: false
    }
  ]);
});
