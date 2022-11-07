import { Schema, ISchema } from "./Schema";
import { Query } from "./Query";

export function Model(schema: ISchema):  {
    new (values: any): {
        assignValues(values: any): void;
        primaryObject(): any;
        update(values: any, callback?: () => void): void | Promise<any>;
        reload(includes: any, callback?: () => void): void | Promise<any>;
        destroy(callback?: () => void): void;
        beforeCreate(callback?: () => void): void;
        beforeUpdate(values: any, callback?: () => void): void;
    };

    create(values: {[key in keyof typeof schema.columns]: string | number | boolean}, options?: any, callback?: () => void): void | Promise<any>;
    all(callback?: () => void): void | Promise<any>;
    destroyAll(callback?: () => void): void | Promise<any>;
    schema: Schema;

    // Same as Query
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
};
//# sourceMappingURL=Model.d.ts.map