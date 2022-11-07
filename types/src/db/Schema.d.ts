import { Query } from './Query';
export class Schema {
    constructor(values: any);
    primary: any;
    subclass_column: any;
    database: any;
    columns: any;
    colsByName: any;
    colsByAttr: any;
    associations: any;
    subclasses: any;
    parseTypes(row: any): void;
}
export interface ISchema {
    table: string;
    primary: string[];
    columns: (string | {
        name: string;
        type: string;
        attr?: string;
    })[];
    associations: () => never[];
    scopes: {
        default: (q: Query) => Query;
        [key: string]: (q: Query) => Query;
    };
    cache: {
        ttl: number;
    };
}
//# sourceMappingURL=Schema.d.ts.map