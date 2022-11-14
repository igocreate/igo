import { Query } from './Query'

export type Schema = {
    constructor: (values: any) => Schema
    primary: any
    subclass_column: any
    database: any
    columns: any
    colsByName: string[]
    colsByAttr: string[]
    associations: any
    subclasses: any
    parseTypes(row: any): void
}

export type ISchema<Child> = {
    table: string
    primary: string[]
    columns: (string | {
        name: string
        type: string
        attr?: string
    })[]
    associations?: (string | object)[][] | (() => (string | object)[][])
    scopes?: {
        default?: (q: Query<Child>) => Query<Child>
        [key: string]: (q: Query<Child>) => Query<Child>
    }
    cache?: {
        ttl: number
    }
}