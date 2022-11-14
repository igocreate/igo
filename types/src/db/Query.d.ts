import { Schema } from "./Schema"
import type { AttributeOf, TypeOf } from "./Model";


type IParams = string | number | boolean | { [key: string]: unknown; } | Date | undefined

export interface IQuery<Child> {
    update(values: {[key in keyof AttributeOf<Child>]?: AttributeOf<Child>[key]}, callback?: () => void): Promise<TypeOf<Child>>;
    find(id: number | {[key in keyof AttributeOf<Child>]?: AttributeOf<Child>[key]}, callback?: () => void): Promise<TypeOf<Child>>;
    destroy(callback?: () => void): Promise<TypeOf<Child>>;
    first(callback?: () => void): Promise<TypeOf<Child>>;
    last(callback?: () => void): Promise<TypeOf<Child>>;
    list(callback?: () => void): Promise<TypeOf<Child>>;
    count(callback?: () => void): Promise<number>;
    where(where?: {[key in keyof AttributeOf<Child>]?: AttributeOf<Child>[key]} | string, params?: IParams[] ): Query<Child>;
    whereNot(whereNot: any): Query<Child>;
    limit(offset: any, limit: any): Query<Child>;
    page(page: any, nb: any): Query<Child>;
    scope(scope: any): Query<Child>;
    unscoped(): Query<Child>;
    select(select: any): Query<Child>;
    includes(includeParams: any): Query<Child>;
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
