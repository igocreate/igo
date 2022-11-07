export = Db;
declare class Db {
    constructor(name: any);
    name: any;
    config: Class;
    driver: any;
    connection: any;
    init(): void;
    pool: any;
    TEST_ENV: boolean;
    getConnection(callback: any): any;
    query(sql: any, params: any, options: any, callback: any): void;
    beginTransaction(callback: any): void;
    commitTransaction(callback: any): void;
    rollbackTransaction(callback: any): void;
}
//# sourceMappingURL=Db.d.ts.map