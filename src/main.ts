import Config from "./config/config.js";
import { Database } from "./database/connection.js"; 
import { Migrations } from "./database/migrations.js";

import { Messages } from "./i18n/messages.js";

async function main() {
    const migrations = new Migrations("./src/migrations");

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

    const messages = new Messages("./src/i18n/messages.yaml");
}

main();
