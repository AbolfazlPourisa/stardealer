import { Bot as GrammyBot } from "grammy";
import { Start } from "./handlers/handlers.js";

export class Bot {
    private bot: GrammyBot;

    constructor(
        token: string
    ) {
        this.bot = new GrammyBot(
            token
        );
    }

    setHandlers(): void {
        this.bot.command("start", new Start().handler)
    }
    
    async start(): Promise<void> {
        await this.bot.start();
    }
}
