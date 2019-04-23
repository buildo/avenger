import { taskEither, TaskEither, fromLeft } from 'fp-ts/lib/TaskEither';
import { range, findFirst } from 'fp-ts/lib/Array';
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

it('RWC', async () => {
  function getToken(): TaskEither<void, string> {
    return taskEither.of('token');
  }
  type Post = { id: number; content: { title: string; body: string } };
  type InvalidToken = 'invalid token';
  type NotFound = 'not found';
  function getPosts(
    token: string,
    limit: number
  ): TaskEither<InvalidToken, Array<Post>> {
    return taskEither.of(
      range(0, limit).map((_, index) => ({
        id: index,
        content: { title: String(index), body: token }
      }))
    );
  }
  function getTags(
    token: string,
    postId: Post['id']
  ): TaskEither<InvalidToken | NotFound, Array<string>> {
    return taskEither.of(
      range(0, postId - 1).map((_, index) => `${token}-${index}`)
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
      findFirst(input.posts, p => p.id === input.postId).fold(
        fromLeft<InvalidToken | NotFound, PostWithTags>('not found'),
        post => getTags(input.token, post.id).map(tags => ({ ...post, tags }))
      ),
    expire(2000)
  );
  const postWithTags = compose(
    product({ token, postId, posts }),
    addTags
  );

  requestAnimationFrame(() =>
    postWithTags
      .run({
        postId: 1,
        posts: { limit: 10 }
      })
      .run()
  );
  const results = await observeShallow(postWithTags, {
    postId: 3,
    posts: { limit: 10 }
  })
    .pipe(
      take(2),
      toArray()
    )
    .toPromise();
  expect(results).toEqual([
    { type: 'Loading' },
    {
      type: 'Success',
      value: {
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
