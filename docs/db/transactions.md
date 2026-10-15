# Transactions

`transaction(fn)` runs `fn` in a database transaction: committed when `fn` resolves, rolled back when it throws. The error is then rethrown to the caller, and the value `fn` resolves to is returned.

```js
const { transaction } = require('@igojs/db');

const invoice = await transaction(async () => {
  const invoice = await Invoice.create({ partner_id, total });
  await InvoiceLine.createMany(lines.map(line => ({ ...line, invoice_id: invoice.id })));
  await partner.update({ last_invoice_at: new Date() });
  return invoice;
});
```

`transaction` targets the main database. For another one, call the method on its instance:

```js
const { dbs } = require('@igojs/db');

await dbs.billing.transaction(async () => { /* ... */ });
```

## Every query goes through the transaction

`fn` receives nothing: the transaction follows the asynchronous context (`AsyncLocalStorage`). Every query started inside `fn` — through a model, a raw `db.query()`, or a service several calls down — runs on the transaction connection, without passing anything around.

```js
// no transaction argument: still inside the caller's transaction
const reserveStock = async (lines) => {
  for (const line of lines) {
    await Product.where({ id: line.product_id }).update({ reserved: line.quantity });
  }
};

await transaction(async () => {
  await Order.create(order);
  await reserveStock(order.lines);
});
```

Only the database the transaction was opened on is concerned: a query on another database runs outside of it.

A query that starts once `fn` has settled — typically a write fired without `await` that runs later — no longer belongs to the transaction: it runs on a pool connection, on its own.

## Nested transactions

A transaction opened inside another becomes a `SAVEPOINT`. When it throws, only its own writes are rolled back: if the caller catches the error, the outer transaction goes on.

```js
await transaction(async () => {
  await Invoice.create(invoice);

  try {
    await transaction(() => sendToAccounting(invoice));
  } catch (err) {
    // the invoice is kept, the accounting writes are not
  }
});
```

Nested transactions started in parallel (`Promise.all`) run one after the other: two savepoints open side by side on one connection would release or roll back each other.

Await a nested transaction before running other queries in the parent: they share its connection, so rolling back the savepoint would undo them too.

## Cache

Inside a transaction, models with a [query cache](./cache.md) read straight from the database: the rows may not be committed yet, so they must not reach the cache other connections share.

Writes are noted, and the versions of the written tables are bumped once, after the commit. After a rollback, nothing is bumped. If the cache cannot be reached after the commit, the error is logged and the transaction still resolves: the data is committed, and the cached reads expire with their TTL.

## Tests

In test mode, each test already runs in a transaction rolled back at the end (see [Testing](/guide/tests)). `transaction()` then becomes a `SAVEPOINT` inside it, with the same behavior: committed writes stay visible until the end of the test, rolled back ones disappear.
