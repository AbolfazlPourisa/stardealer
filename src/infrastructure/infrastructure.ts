import { Database } from "../database/connection.js";
import type { MessagesData } from "../i18n/messagesData.js";

export let Infrastructure: {
    database: Database;
    messages: MessagesData;
};

export function initializeInfrastructure(
    database: Database,
    messages: MessagesData,
) {
    Infrastructure = {
        database,
        messages,
    };
}
