import { Database } from "./database/connection.js"; 
import { Migrations } from "./database/migrations.js";
import Config from "./config/config.js";

async function main() {
    let migrations = new Migrations("./src/migrations");

    let database = new Database(
        Config.dbHost,
        Config.dbPort,
        Config.dbUser,
        Config.dbPassword,
        Config.dbName
    );

    await database.connect();
    await database.test();
    await database.createTables(migrations.config);
}

main();
