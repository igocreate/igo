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

export type ISchema<Model, T> = {
    table: string
    primary: string[]
    columns: (string | {
        name: string
        type: string
        attr?: string
    })[]
    associations?: (string | object)[][] | (() => (string | object)[][])
    scopes?: {
        default?: ((q: Query<Model, T>) => Query<Model, T>) | undefined
        [key: string]: ((q: Query<Model, T>) => Query<Model, T>) | undefined
    }
    cache?: {
        ttl: number
    }
}