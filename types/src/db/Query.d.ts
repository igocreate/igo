import { Schema } from './Schema'
export class Query {
    constructor(modelClass: any, verb?: string);
    modelClass: any;
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
    delete(callback?: () => void): void | Promise<any>;
    options(options: any): this;
    getDb(): any;
    toSQL(): any;
    paginate(callback?: () => void): any;
    loadAssociation(include: any, rows: any, callback?: () => void): any;
    execute(callback?: () => void): void | Promise<any>;
    doExecute(callback?: () => void): void;
    runQuery(callback?: () => void): void;
    newInstance(row: any): any;
    applyScopes(): void;
    values(values: {[key in keyof typeof this.schema.columns]: string | number | boolean}): this;
    from(table: any): this;

    // Same as Model
    update(values: {[key in keyof typeof this.schema.columns]: string | number | boolean}, callback?: () => void): void | Promise<any>;
    destroy(callback?: () => void): void | Promise<any>;
    where(where?: string, params?: {[key in keyof typeof this.schema.columns]: string | number | boolean}): Query;
    whereNot(whereNot: any): Query;
    first(callback?: () => void): void | Promise<any>;
    last(callback?: () => void): void | Promise<any>;
    limit(offset: any, limit: any): Query;
    page(page: any, nb: any): Query;
    scope(scope: any): Query;
    unscoped(): Query;
    list(callback?: () => void): void | Promise<any>;
    select(select: any): Query;
    count(callback?: () => void): void | Promise<any>;
    includes(includeParams: any): Query;
    find(id: number, callback?: () => void): any;
    order(order: string): Query;
    distinct(columns: string): Query;
    group(columns: string): Query;
}
//# sourceMappingURL=Query.d.ts.map