# Orders: list and create

Users with `orders:read` see their orders; with `orders:create` they add
one. Spec: `orders.spec.md`. Backend first, then the page, then the
end-to-end scenario.

- [ ] Write the end-to-end scenarios
      What: Copy the scenarios of the spec into a new `orders.feature`, word for
      word; they stay red until the last task.
      Read:
  - `orders.spec.md` — section Scenarios
  - `apps/web-e2e/features/users.feature` — style of an existing feature
- [ ] Order in the domain
  - [ ] An order needs at least one line
        What: `Order.create` refuses an empty list of lines with
        `ORDER_EMPTY`.
        Read:
    - `libs/api/users/src/lib/domain/user/user.ts` — how it refuses input
      Test: libs/api/orders/src/lib/domain/order/order.spec.ts :: refuses an order without lines
  - [ ] The total is the sum of the lines
        What: `order.total` adds price × quantity of each line.
        Test: libs/api/orders/src/lib/domain/order/order.spec.ts :: sums the lines
- [ ] List orders over the API
      What: `GET /api/orders` returns the user's orders in the envelope, newest
      first.
      Read:
  - `docs/concepts/api-contracts.md` — the envelope and the codes
    Test: apps/api/test/orders.spec.ts :: lists the user's own orders
