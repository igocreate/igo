export function createPool(dbconfig: any): any;
export function getConnection(pool: any, callback: any): void;
export function query(connection: any, sql: any, params: any, callback: any): void;
export function release(connection: any): void;
export function beginTransaction(connection: any, callback: any): void;
export function commit(connection: any, callback: any): void;
export function rollback(connection: any, callback: any): void;
export namespace dialect {
    export function createDb(db: any): string;
    export function dropDb(db: any): string;
    export const createMigrationsTable: string;
    export const listMigrations: string;
    export const findMigration: string;
    export const insertMigration: string;
    export const esc: string;
    export function param(i: any): string;
    export function limit(i: any, j: any): string;
    export const returning: string;
    export function insertId(result: any): any;
    export function getRows(result: any): any;
    export const emptyInsert: string;
    const _in: string;
    export { _in as in };
    export const notin: string;
    export function getLock(): string;
    export function gotLock(res: any): any;
    export function releaseLock(): string;
}
//# sourceMappingURL=postgresql.d.ts.map