# web-users

The users page: with `users:read` the list of users, marked active once they
logged in, and with `users:create` the form that adds one and shows its
generated password once. Data comes through `UsersStore`; the view is
`UsersView` in `libs/web/ui`.

## Impact

What else a change here needs:

- A change to the view goes to `UsersView` in `libs/web/ui`, with its story; texts go to both language files.
- A new action needs its permission from `libs/api/users`.
