declare function _exports(schema: any): {
    new (values: any): {
        assignValues(values: any): void;
        primaryObject(): any;
        update(values: any, callback: any): void | Promise<any>;
        reload(includes: any, callback: any): void | Promise<any>;
        destroy(callback: any): void;
        beforeCreate(callback: any): void;
        beforeUpdate(values: any, callback: any): void;
    };
    find(id: any, callback: any): any;
    create(values: any, options: any, callback: any): void | Promise<any>;
    first(callback: any): void | Promise<any>;
    last(callback: any): void | Promise<any>;
    list(callback: any): void | Promise<any>;
    all(callback: any): void | Promise<any>;
    select(select: any): Query;
    where(where: any, params: any): Query;
    whereNot(whereNot: any): Query;
    limit(offset: any, limit: any): Query;
    page(page: any, nb: any): Query;
    order(order: any): Query;
    distinct(columns: any): Query;
    group(columns: any): Query;
    count(callback: any): void | Promise<any>;
    destroy(id: any, callback: any): void | Promise<any>;
    destroyAll(callback: any): void | Promise<any>;
    update(values: any, callback: any): void | Promise<any>;
    includes(includes: any): Query;
    unscoped(): Query;
    scope(scope: any): Query;
    schema: Schema;
};
export = _exports;
import Query = require("./Query");
import Schema = require("./Schema");
//# sourceMappingURL=Model.d.ts.map