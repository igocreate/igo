import { Schema } from "./Schema"

export interface IQuery<Child> {
    update(values: {[key in keyof Child]?: Child[key]}, callback?: () => void): void | Promise<Child>;
    destroy(callback?: () => void): void | Promise<Child>;
    where(where?: {[key in keyof Child]?: Child[key]}, params?: [string | number | boolean]): Query<Child>;
    whereNot(whereNot: any): Query<Child>;
    first(callback?: () => void): void | Promise<Child>;
    last(callback?: () => void): void | Promise<Child>;
    limit(offset: any, limit: any): Query<Child>;
    page(page: any, nb: any): Query<Child>;
    scope(scope: any): Query<Child>;
    unscoped(): Query<Child>;
    list(callback?: () => void): void | Promise<Child>;
    select(select: any): Query<Child>;
    count(callback?: () => void): void | Promise<Child>;
    includes(includeParams: any): Query<Child>;
    find(id: number | {[key in keyof Child]?: Child[key]}, callback?: () => void): void | Promise<Child>;
    order(order: string): Query<Child>;
    distinct(columns: string): Query<Child>;
    group(columns: string): Query<Child>;
}

export interface Query<Child> extends IQuery<Child> {
    constructor : (modelClass: string, verb?: string) => Query<Child>
    modelClass: string;
    schema: Schema;
    query: {
        table: any;
        select: any;
        verb: string;
        where: any[];
        whereNot: any[];
        order: any[];
        distinct: any;
        group: any;
        includes: {};
        options: {};
        scopes: string[];
    };
    delete(callback?: () => void): void | Promise<Query<Child>>;
    options(options: any): Query<Child>;
    getDb(): any;
    toSQL(): any;
    paginate(callback?: () => void): any;
    loadAssociation(include: any, rows: any, callback?: () => void): any;
    execute(callback?: () => void): void | Promise<Query<Child>>;
    doExecute(callback?: () => void): void;
    runQuery(callback?: () => void): void;
    newInstance(row: any): any;
    applyScopes(): void;
    values(values: any): Query<Child>;
    from(table: any): Query<Child>;
}
