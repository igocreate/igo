/**
 * Minimal declarations for @igojs/db: enough to declare a model, query it and
 * read typed rows. The query surface is declared loosely — `where` takes any
 * object, joins and includes are untyped — and tightens as projects need it.
 */

export interface ColumnDefinition {
  name:     string;
  type?:    string;
  [key: string]: unknown;
}

export interface Schema {
  table:         string;
  columns:       Array<string | ColumnDefinition>;
  primary?:      string[];
  associations?: unknown[];
  scopes?:       Record<string, unknown>;
  cache?:        unknown;
  [key: string]: unknown;
}

export interface Pagination {
  page:     number;
  nb:       number;
  nb_pages: number;
  count:    number;
  next:     number | null;
  [key: string]: unknown;
}

export interface Page<T> {
  rows:       T[];
  pagination: Pagination;
}

export interface Query<T> {
  where(where: Record<string, unknown> | string, params?: unknown[]): Query<T>;
  whereNot(whereNot: Record<string, unknown>): Query<T>;
  select(select: string | string[]): Query<T>;
  limit(limit: number): Query<T>;
  offset(offset: number): Query<T>;
  page(page: number, nb?: number): PaginatedQuery<T>;
  order(...orders: string[]): Query<T>;
  orderRaw(order: string): Query<T>;
  distinct(...columns: string[]): Query<T>;
  group(...columns: string[]): Query<T>;
  includes(includes: unknown): Query<T>;
  join(association: string, columns?: string[], type?: string): Query<T>;
  scope(scope: string): Query<T>;
  unscope(...clauses: string[]): Query<T>;
  find(id: number | string): Promise<T | null>;
  first(): Promise<T | null>;
  last(): Promise<T | null>;
  list(): Promise<T[]>;
  count(): Promise<number>;
  update(values: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}

export interface PaginatedQuery<T> extends Omit<Query<T>, 'list'> {
  list(): Promise<Page<T>>;
}

export interface ModelInstance<Row> {
  update(values: Partial<Row>): Promise<this>;
  reload(includes?: unknown): Promise<this>;
  delete(): Promise<unknown>;
}

export type Instance<Row> = Row & ModelInstance<Row>;

export interface ModelClass<Row> {
  new (values?: Partial<Row>): Instance<Row>;
  schema: Schema;
  find(id: number | string): Promise<Instance<Row> | null>;
  create(values: Partial<Row>, options?: unknown): Promise<Instance<Row>>;
  first(): Promise<Instance<Row> | null>;
  last(): Promise<Instance<Row> | null>;
  list(): Promise<Instance<Row>[]>;
  count(): Promise<number>;
  select(select: string | string[]): Query<Instance<Row>>;
  where(where: Record<string, unknown> | string, params?: unknown[]): Query<Instance<Row>>;
  whereNot(whereNot: Record<string, unknown>): Query<Instance<Row>>;
  limit(limit: number): Query<Instance<Row>>;
  offset(offset: number): Query<Instance<Row>>;
  page(page: number, nb?: number): PaginatedQuery<Instance<Row>>;
  order(...orders: string[]): Query<Instance<Row>>;
  orderRaw(order: string): Query<Instance<Row>>;
  distinct(...columns: string[]): Query<Instance<Row>>;
  group(...columns: string[]): Query<Instance<Row>>;
  includes(includes: unknown): Query<Instance<Row>>;
  join(association: string, columns?: string[], type?: string): Query<Instance<Row>>;
  scope(scope: string): Query<Instance<Row>>;
  unscope(...clauses: string[]): Query<Instance<Row>>;
  update(values: Partial<Row>): Query<Instance<Row>>;
  delete(id: number | string): Promise<unknown>;
  deleteAll(): Promise<unknown>;
  destroyAll(): Promise<unknown>;
}

/**
 *   interface BookRow { id: number; title: string; }
 *   class Book extends Model<BookRow>({ table: 'books', columns: ['id', 'title'] }) {}
 *   const book = await Book.find(1);   // Instance<BookRow> | null
 */
export declare function Model<Row = Record<string, unknown>>(schema: Schema): ModelClass<Row>;

export declare function init(dependencies: Record<string, unknown>): void;

export declare const Query: unknown;
export declare const CachedQuery: unknown;
export declare const Schema: unknown;
export declare const Sql: unknown;
export declare const Db: unknown;
export declare const dbs: unknown;
export declare const migrations: unknown;
export declare const DataTypes: unknown;
export declare const CacheStats: unknown;
export declare const PaginatedOptimizedSql: unknown;
