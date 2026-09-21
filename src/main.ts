import Config from "./config/config.js";
import { Database } from "./database/connection.js"; 
import { Migrations } from "./database/migrations.js";
import { Messages } from "./i18n/messages.js";
import { initializeInfrastructure } from "./infrastructure/infrastructure.js";
import { Bot } from "./bot/bot.js";

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

    initializeInfrastructure(
        database,
        messages.messages
    );

    const bot = new Bot(Config.token);

    bot.setHandlers();
    await bot.start();
}

main();
