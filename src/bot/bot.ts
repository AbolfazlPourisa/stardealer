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
            {
                client: {
                    apiRoot: "https://tapi.bale.ai"
                }
            }            
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
        this.bot.callbackQuery(/^accept_pvp_([0-9a-f-]{36})$/, pvp.acceptPvpHandler.bind(pvp));
        this.bot.callbackQuery(/^cancel_pvp_([0-9a-f-]{36})$/, pvp.cancelPvpHandler.bind(pvp));
    }
    
    async start(): Promise<void> {
        await this.bot.start();
    }
}
