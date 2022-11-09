import { Schema, type ISchema } from './Schema'
import { IQuery } from './Query'

export interface InewModel<Child> {
    assignValues(values: Child): void;
    primaryObject(): Child;
    update(values: Child, callback?: () => void): void | Promise<Child>;
    reload(includes: any, callback?: () => void): void | Promise<Child>;
    destroy(callback?: () => void): void;
    beforeCreate(callback?: () => void): void;
    beforeUpdate(values: Child, callback?: () => void): void;
}

export function FModel<Child, Model> (schema: ISchema<Child, Model>): {
    schema: Schema;

    new (values: Child): InewModel<Child>;

    create(values: {[key in keyof Model]?: Model[key]}, options?: any, callback?: () => void): void | Promise<Model>;
    all(callback?: () => void): void | Promise<Child>;
    destroyAll(callback?: () => void): void | Promise<Child>;
} & IQuery<Model>