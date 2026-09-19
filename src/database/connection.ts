import type { DatabaseConfig } from "./types.js";
import { Pool, type PoolClient } from "pg";

export class Database {
    public pool: Pool;

    constructor(
        host: string,
        port: number,
        user: string,
        password: string,
        database: string
    ) {
        this.pool = new Pool({
            host:     host,
            port:     port,
            user:     user,
            password: password,
            database: database
        });
    }

    async connect(): Promise<PoolClient> {
        return this.pool.connect();
    }

    async test(): Promise<void> {
        await this.pool.query("SELECT 1");
    }

    async createTables(databaseConfig: DatabaseConfig): Promise<void> {
        for (const migration of databaseConfig.migrations) {
            for (const query of migration.files) {
                await this.pool.query(
                    query
                );
            }

            console.log(`✓ Migration "${migration.name}" applied`);
        }

        console.log("✓ Migrations applied");
    }

    async close(): Promise<void> {
        await this.pool.end();
    }
}
