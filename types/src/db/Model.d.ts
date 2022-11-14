import { Schema, type ISchema } from './Schema'
import { IQuery } from './Query'

export type AttributeOf<Child> = Child

export interface InewModel<Child> {
    assignValues(values: Child): void;
    primaryObject(): Child;
    update(values: Child, callback?: () => void): void | Promise<Child>;
    reload(includes: any, callback?: () => void): void | Promise<Child>;
    destroy(callback?: () => void): void;
    beforeCreate(callback?: () => void): void;
    beforeUpdate(values: Child, callback?: () => void): void;
}

export function FModel<Child> (schema: ISchema<Child>): {
    schema: Schema;

    new (values: Child): InewModel<Child >;

    create(values: {[key in keyof AttributeOf<Child>]?: Child[key]}, options?: any, callback?: () => void): void | Promise<AttributeOf<Child>>;
    all(callback?: () => void): void | Promise<Child>;
    destroyAll(callback?: () => void): void | Promise<Child>;
} & IQuery<Child>

export type Model = typeof FModel 