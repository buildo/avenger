# Example

Suppose you have a third party json api with the following endpoints
- `GET /users/:userId/following`: returns the list of blog ids the user is following
- `GET /blogs/:blogId?lastN=`: returns last n posts for the given blog
- `GET /posts/:postId/comments`: returns all comments for a given blog post


Your task is to display in a summary all the comments for the last post on all the blogs the current user is following.
