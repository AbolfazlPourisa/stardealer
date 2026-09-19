import type { MessagesData } from "./messagesData.js";
import fs from "node:fs";
import YAML from "yaml";

export class Messages {
    public messages: MessagesData

    constructor(messagesPath: string) {
        const content = fs.readFileSync(messagesPath, "utf-8");

        this.messages = YAML.parse(content);
    }
}
