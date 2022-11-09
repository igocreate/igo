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

export type ISchema<Child, Model> = {
    table: string
    primary: string[]
    columns: (string | {
        name: string
        type: string
        attr?: string
    })[]
    associations?: (string | object)[][] | (() => (string | object)[][])
    scopes?: {
        default?: (q: Query<Model>) => Query<Model>
        [key: string]: (q: Query<Model>) => Query<Model>
    }
    cache?: {
        ttl: number
    }
}