export interface Migration {
    id: number;
    name: string;
    files: string[];
}

export interface DatabaseConfig {
    migrations: Migration[];
}
