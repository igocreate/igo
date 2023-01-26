import { Schema, type ISchema } from './Schema'
import type { Query, IQuery } from './Query'

export type Error = { err?: {[key:string]: unknown}}
export type Child<T> = T & Error 
export type ChildValues<T> = {[P in keyof T]?: T[P] extends T ? never : T[P]}

export type Model = <Model, T>(schema: ISchema<Model, T>) => { 
    new (values: T): T & Error & IQuery<Model, T>;

    assignValues(values: T): void;
    primaryObject(): T;
    update(values: T, callback?: () => void): void | Promise<Child<T>>;
    reload(includes: any, callback?: () => void): void | Promise<Child<T>>;
    destroy(callback?: () => void): void;
    beforeCreate(callback?: () => void): void;
    beforeUpdate(values: T, callback?: () => void): void;
    
    create(values: ChildValues<T>, options?: any, callback?: () => void): Promise<Model>;
    all(callback?: () => void): void | Error | Promise<Array<Model>>;
    destroyAll(callback?: () => void): void;
} & Query<Model, T>