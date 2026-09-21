import type { Context as GrammyContext } from "grammy";

export type Language = "fa" | "en";

export interface Context extends GrammyContext {
    lang: Language;
}
