# Example

Suppose you have a third party json api with the following endpoints
- `GET /users/:userId/following`: returns the list of blog ids the user is following
- `GET /blogs/:blogId`: returns info for the given blog
- `GET /blogs/:blogId/posts?lastN=`: returns last n posts for the given blog
- `GET /posts/:postId/lastComment`: returns the last comment for a given blog post

**NOTE**
> Yes I know, shitty API.. but you don't always control it :P

### Your first task

Display all the comments for the last post, for all the blogs the current user is following. Something like:

```
blog A (post 1)
- comment: foo
blog B (post 2)
- comment: bar
...
```
Where each line displays the trimmed comment content, and a user can click on a comment line to read the whole content.

Our client state will thus simply be:
- the current `userId`. We can suppose we saved it somewhere in local storage. We also suppose for the sake of simplicity our api doesn't require any authentication header

Let's define a simple `Query` to fetch the current user blog ids:

```js
const blogIds = Query({
    fetch: ({ userId }) => () => fetch(`/users/${userId}/following`).then(r => r.json())
});
```
[Read more about Queries](../core/Queries.html)

And then one for a single blog details:

```js
const blog = Query({
    dependencies: {
        blogId: { query: blogIds, multi: true }
    },
    fetch: () => ({ blogId }) => fetch(`blogs/${blogId}`).then(r => r.json())
});
```

Another one to fetch the last blog post for a given blog:

```js
const lastPost = Query({
    dependencies: {
        blogId: { query: blogIds, multi: true }
    },
    fetch: () => ({ blogId }) => fetch(`/blogs/${blogId}/posts?lastN=1`).then(r => r.json()[0])
});
```

And the last one for retrieving each post's comments:

```js
const lastComment = Query({
    dependencies: {
        postId: {
            query: lastPost, map: ({ _id }) => _id
        }
    },
    fetch: () => ({ postId }) => fetch(`/posts/${postId}/lastComment`).then(r => r.json())
});
```

We just set up the following graph of dependencies:

```
      blogIds
      /     \
    blog    lastPost
              |
          lastComment
   
```

We can wrap all our queries in a simple object and obtain the "universe" of queries avenger is interested in:

```js
const universe = { blogIds, blog, lastPost, lastComment };
const avenger = new Avenger(universe);
```

Now that we have obtained an avenger instance, we are ready to use it. Supposing the `userId` param is fixed, we have a single state in our application:

```js
const state = { userId: localStorage.getItem('userId') };
```

and thus we probably need to render just once, but let's re-render anyway for every state change so that we are ready for later when our application will transition through different states.

**NOTE**
> re-rendering at every state change can be really bad, depending on how your rendering works.

```js
avenger.on('change', ({ blog, lastComment }) => {
    // check if data is already available
    // (read on for a better way of doing this)
    if (blog && lastComment) {
        render(blog.map(({ title }, i) => {
            const commentContent = lastComment[i].content;
            return `${title}<br/>${commentContent}`;
        }));
    }
});
```

Let's tell our avenger instance what data we are interested into, and what's the current state:

```js
avenger.run({ blog, lastComment }, state);
```

Avenger will now update it's current query graph, resolve dependencies, and give us back the data when it is ready.

### Ready State

Pretty bare bone.. what if we want to show a loader while data is still fetching?

Turns out it is simple using the special `__meta` property:

```js
avenger.on('change', ({
    blog, lastComment,
    __meta: {
        blog: { loading: loadingBlog },
        lastComment: { loading: loadingLastComment },
    }
}) => {
    if (loadingBlog || loadingLastComment) {
        render(blog.map(({ title }, i) => {
            const commentContent = lastComment[i].content;
            return `${title}<br/>${commentContent}`;
        }));
    } else {
        renderLoader();
    }
});
```

That's it, the `loading` property for each declared query is updated coherently with the current state of the query in the graph. We'll see more useful `__meta` props in the following.

### More Client State

Now suppose we need to keep track of the `read: Bool` state for each of the comment. We want to mark comment as `read` when the user clicks it, and display it differently based on the `read` state. Our api doesn't know anything about our users read state, so we'll keep track of it client side in browser local storage.

To spice things up even more, suppose we can change the current user, and show a personalized summary of comments.

### Caching