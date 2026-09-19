import type { Variables } from "./types.js";

export class I18n {
    public readonly text: string;

    constructor(
        message: string,
        variables: Variables
    ) {
        this.text = message.replace(
            /\{(\w+)\}/g,
            (_, key: keyof Variables) => variables[key] ?? "unknown"
        );
    }
}
