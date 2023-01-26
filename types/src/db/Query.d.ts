import { Schema } from "./Schema"
import type { ChildValues } from "./Model";


type IParams = string | number | boolean | { [key: string]: unknown; } | Date

export type IQuery<Model, T> = {
    update(values: ChildValues<T>, callback?: () => void): Promise<Model>;
    destroy(callback?: () => void): Promise<Model>;   
}

export type Query<Model, T> = {
    constructor : (modelClass: string, verb?: string) => Query<Model, T>
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
    options(options: any): Query<Model, T>;
    getDb(): any;
    toSQL(): any;
    paginate(callback?: () => void): any;
    loadAssociation(include: any, rows: any, callback?: () => void): any;
    doExecute(callback?: () => void): void;
    runQuery(callback?: () => void): void;
    newInstance(row: any): any;
    applyScopes(): void;
    
    values(values: any): Query<Model, T>;
    from(table: any): Query<Model, T>;
    where(where?: ChildValues<T> | string, params?: IParams[] ): Query<Model, T>;
    whereNot(whereNot: any): Query<Model, T>;
    limit(offset: any, limit: any): Query<Model, T>;
    page(page: any, nb: any): Query<Model, T>;
    scope(scope: any): Query<Model, T>;
    unscoped(): Query<Model, T>;
    select(select: any): Query<Model, T>;
    includes(includeParams: any): Query<Model, T>;
    order(order: string): Query<Model, T>;
    distinct(columns: string): Query<Model, T>;
    group(columns: string): Query<Model, T>;

    delete(callback?: () => void): void | Promise<Query<Model, T>>;
    execute(callback?: () => void): void | Promise<Query<Model, T>>;
    
    find(id: ChildValues<T> | number, callback?: () => void): Promise<Model>;
    first(callback?: () => void): Promise<Model>;
    last(callback?: () => void): Promise<Model>;
    list(callback?: () => void): Promise<Array<Model>>;
    count(callback?: () => void): Promise<number>;
} & IQuery<Model, T>