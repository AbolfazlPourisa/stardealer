import type { Context } from "../context.js";

export async function languageMiddleware(
    ctx: Context,
    next: () => Promise<void>
) {
    ctx.lang = ctx.from?.language_code === "fa"
        ? "fa"
        : "en";

    await next();
}
