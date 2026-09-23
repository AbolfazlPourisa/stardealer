import { Bot as GrammyBot } from "grammy";
import type { Context } from "./context.js";
import { languageMiddleware } from "./middleware/language.js";
import { Start, Claim, Pvp } from "./handlers/handlers.js";

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
        const start = new Start();
        const claim = new Claim();
        const pvp = new Pvp();

        this.bot.use(languageMiddleware);

        this.bot.command("start", start.handler.bind(start));
        this.bot.command("claim", claim.handler.bind(claim));
        this.bot.command("pvp", pvp.handler.bind(pvp));
    }
    
    async start(): Promise<void> {
        await this.bot.start();
    }
}
