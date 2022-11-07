export = ArrayForm;
declare const ArrayForm_base: {
    new (): {
        submit(req: any, scope?: string): any;
        _src: any;
        errors: any;
        sanitize(req: any, scope?: string): void;
        revert(): void;
        convert(req: any, scope?: string): void;
        getValues(): any;
    };
    schema: any;
};
declare class ArrayForm extends ArrayForm_base {
    validate(req: any): void;
}
//# sourceMappingURL=ArrayForm.d.ts.map