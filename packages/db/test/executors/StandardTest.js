const assert = require('assert');

const Standard = require('../../src/executors/Standard');
const Query    = require('@igojs/db').Query;
const Model    = require('@igojs/db').Model;

const mockGetDb = (query) => {
  query.getDb = () => ({
    driver: {
      dialect: {
        esc: '`',
        param: () => '?',
        in: 'IN',
        notin: 'NOT IN',
        limit: () => 'LIMIT ?, ?',
        insertId: (rows) => rows.insertId
      }
    }
  });
  return query;
};

describe('db.executors.Standard', function() {

  class Item extends Model({
    table: 'items',
    primary: ['id'],
    columns: { id: 'integer', name: 'string' }
  }) {}

  it('returns hydrated model instances for a non-paginated select', async () => {
    const query = mockGetDb(new Query(Item));
    query.runQuery = async () => [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];

    const rows = await new Standard(query).run();

    assert.strictEqual(rows.length, 2);
    assert.ok(rows[0] instanceof Item);
    assert.strictEqual(rows[0].name, 'a');
  });

  it('builds pagination metadata for a paginated select', async () => {
    const query = mockGetDb(new Query(Item).page(2, 10));
    query.count    = async () => 35;
    query.runQuery = async () => [{ id: 11, name: 'k' }];

    const { pagination, rows } = await new Standard(query).run();

    assert.strictEqual(rows.length, 1);
    assert.deepStrictEqual(
      { page: pagination.page, nb: pagination.nb, count: pagination.count, nb_pages: pagination.nb_pages, previous: pagination.previous, next: pagination.next },
      { page: 2, nb: 10, count: 35, nb_pages: 4, previous: 1, next: 3 }
    );
  });

  it('clamps an out-of-range page and re-runs the select', async () => {
    const query = mockGetDb(new Query(Item).page(99, 10));
    query.count = async () => 25;
    let selects = 0;
    query.runQuery = async () => { selects++; return [{ id: 21, name: 'x' }]; };

    const { pagination } = await new Standard(query).run();

    assert.strictEqual(pagination.page, 3); // ceil(25 / 10)
    assert.strictEqual(selects, 2);         // initial select + re-run after clamping
  });

  it('returns a single instance when limit === 1', async () => {
    const query = mockGetDb(new Query(Item));
    query.query.limit = 1;
    query.runQuery = async () => [{ id: 1, name: 'a' }];

    const row = await new Standard(query).run();

    assert.ok(row instanceof Item);
    assert.strictEqual(row.id, 1);
  });

  it('returns null when limit === 1 and no rows match', async () => {
    const query = mockGetDb(new Query(Item));
    query.query.limit = 1;
    query.runQuery = async () => [];

    const row = await new Standard(query).run();

    assert.strictEqual(row, null);
  });
});
