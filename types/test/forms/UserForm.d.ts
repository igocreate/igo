export = UserForm;
declare const UserForm_base: {
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
declare class UserForm extends UserForm_base {
    validate(req: any): void;
}
//# sourceMappingURL=UserForm.d.ts.map