import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import type { DatabaseConfig, Migration } from "./types.js";

export class Migrations {
    public config: DatabaseConfig;
    
    constructor(
        migrationsPath: string
    ) {
        this.config = {
            migrations: []
        }

        const content = fs.readFileSync(
            path.join(migrationsPath, "database.yaml"),
            "utf-8"
        );

        const migrations = YAML.parse(content).migrations;

        for (const migrationConfig of migrations) {
            let migration: Migration = {
                id: migrationConfig.id,
                name: migrationConfig.name,
                files: []
            }

            for (const filePath of migrationConfig.files) {
                migration.files.push(
                    fs.readFileSync(
                        path.join(
                            migrationsPath,
                            migrationConfig.path,
                            filePath
                        ),
                        "utf-8"
                    )
                );
            }

            this.config.migrations.push(migration);
        }
    }
}
