import { Bot as GrammyBot } from "grammy";
import type { Context } from "./context.js";
import { languageMiddleware } from "./middleware/language.js";
import { Start } from "./handlers/handlers.js";

export class Bot {
    private bot: GrammyBot<Context>;

    constructor(
        token: string
    ) {
        this.bot = new GrammyBot<Context>(
            token,
        );
    }

    setHandlers(): void {
        this.bot.use(languageMiddleware);

        this.bot.command("start", new Start().handler)
    }
    
    async start(): Promise<void> {
        await this.bot.start();
    }
}
