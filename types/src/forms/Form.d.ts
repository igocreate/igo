// import { Schema, type ISchema } from '../db/Schema'

type ISchema = {
    attributes : [
        {
            name : string,
            type : string,
        }[]
    ]
}

export function FForm (schema: ISchema): {
    new (): {
        submit(req: Request, scope?: string): any;
        _src: any;
        errors: any;
        sanitize(req: Request, scope?: string): void;
        revert(): void;
        convert(req: Request, scope?: string): void;
        getValues(): string[];
    };
    schema: ISchema;
};
//# sourceMappingURL=Form.d.ts.map