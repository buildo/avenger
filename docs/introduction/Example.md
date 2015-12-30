# Example

Suppose you have a third party json api with the following endpoints
- `GET /users/:userId/following`: returns the list of blog ids the user is following
- `GET /blogs/:blogId`: returns info for the given blog
- `GET /blogs/:blogId/posts?lastN=`: returns last n posts for the given blog
- `GET /posts/:postId/comments`: returns all comments for a given blog post

**NOTE**
> Yes I know, shitty API.. but you don't always control it :P

### Your first task

Display in a summary all the comments for the last post on all the blogs the current user is following. Something like:

```
blog A (post 1)
- comment: foo
- comment: bar
blog B (post 2)
- comment: foo bar
- comment: baz
- comment: foo bar baz
...
```
Where each line displays the trimmed comment content, and a user can click on a comment line to read the whole content.

Our client state will thus simply be:
- the current `userId`. We can suppose we saved it somewhere in local storage. We also suppose for the sake of simplicity our api doesn't require any authentication header

Let's define a simple `Query` to fetch the current user blog ids:

```js
const blogIds = Query({
    fetch: ({ userId }) => () => fetch(`/users/${userId}/following`)
});
```
[Read more about Queries](../core/Queries)

And then one for a single blog details:

```js
const blog = Query({
    dependencies: {
        blogId: { query: blogIds, multi: true }
    },
    fetch: () => ({ blogId }) => fetch(`blogs/${blogId}`)
});
```

Another one to fetch the last blog post for a given blog:

```js
const lastPost = Query({
    dependencies: {
        blogId: { query: blogIds, multi: true }
    },
    fetch: () => ({ blogId }) => fetch(`/blogs/${blogId}/posts?lastN=1`)
});
```


### More state

Now suppose we need to keep track of the `read: Bool` state for each of the comment. We want to mark comment as `read` when the user clicks it, and display it differently based on the `read` state. Our api doesn't know anything about our users read state, so we'll keep track of it client side in browser local storage.