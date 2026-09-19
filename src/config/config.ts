import "dotenv/config";

const Config = {
    token: process.env["TOKEN"]!,
    dbHost: process.env["DB_HOST"]!,
    dbPort: Number(process.env["DB_PORT"]),
    dbUser: process.env["DB_USER"]!,
    dbPassword: process.env["DB_PASSWORD"]!,
    dbName: process.env["DB_NAME"]!,
};

export default Config;
