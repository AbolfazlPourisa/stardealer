import type { Context } from "../context.js";
import { Infrastructure } from "../../infrastructure/infrastructure.js";
import { I18n } from "../../i18n/i18n.js";

interface Handler {
    handler(ctx: Context): Promise<void>;
}

export class Start implements Handler {
    async handler(ctx: Context) {
        const lang = ctx.lang;

        ctx.reply(
            new I18n(
                Infrastructure.messages["start"]?.[lang]!,
                {}
            ).text
        );
    }
}

