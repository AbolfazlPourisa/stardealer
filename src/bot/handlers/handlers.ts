import { InlineKeyboard } from "grammy";
import type { Context } from "../context.js";
import { Infrastructure } from "../../infrastructure/infrastructure.js";
import { I18n } from "../../i18n/i18n.js";
import type { PoolClient } from "pg";
import { randomUUID } from "node:crypto";

interface Handler {
    handler(ctx: Context): Promise<void>;
}

abstract class Command implements Handler {
    abstract handler(ctx: Context): Promise<void>;

    protected async addUser(ctx: Context): Promise<void> {        
        await Infrastructure.database.pool.query(
            `
                INSERT INTO users(
                    uuid,
                    user_id,
                    first_name,
                    stars
                )
                VALUES(
                    $1,
                    $2,
                    $3,
                    0
                )
            `,
            [
                randomUUID(),
                ctx.from?.id,
                ctx.from?.first_name
            ]
        );
    }

    protected async userExists(ctx: Context): Promise<boolean> {
        const result = await Infrastructure.database.pool.query<{
            exists: boolean
        }>(
            `
                SELECT EXISTS (
                    SELECT 1
                    FROM users
                    WHERE user_id = $1
                )
            `,
            [
                ctx.from?.id
            ]
        );

        return result.rows[0]?.exists ?? false;
    }
}

export class Start extends Command {
    async handler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

        try {
            const userExists = await this.userExists(ctx);

            if (!userExists) {
                await this.addUser(ctx);
            }
        } catch (error) {
            console.error(error);
        }

        await ctx.reply(
            new I18n(
                Infrastructure.messages["start"]?.[lang] ?? "Something went wrong",
                {}
            ).text
        );
    }
}

export class Claim extends Command {
    private async claimStars(client: PoolClient, ctx: Context): Promise<number | undefined> {
        const result = await client.query<{
            stars: number
        }>(
            `
                WITH claim AS (
                    SELECT floor(random() * 26 - 5)::int AS stars
                )
                UPDATE users
                SET 
                    stars = users.stars + claim.stars,
                    last_stars_claimed_at = NOW() 
                FROM claim
                WHERE users.user_id = $1
                RETURNING claim.stars
            `,
            [
                ctx.from?.id
            ]
        );

        return result.rows[0]?.stars;
    }

    async handler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

        try {
            if (!await this.userExists(ctx)) await this.addUser(ctx);
        } catch (error) {
            console.error(error);
            
            await ctx.reply(
                "Something went wrong"
            );

            return;
        }

        try {
            await Infrastructure.database.transaction(async (client: PoolClient) => {
                const user = await client.query<{
                    last_stars_claimed_at: Date;
                    stars: string;
                }>(
                    `
                        SELECT last_stars_claimed_at, stars
                        FROM users
                        WHERE user_id = $1
                        FOR UPDATE
                    `, 
                    [
                        ctx.from?.id    
                    ]
                );
                
                if (!user.rows[0]) {
                    await this.addUser(ctx);

                    await this.claimStars(client, ctx);

                    return;
                }
                
                const elapsed = Date.now() - user.rows[0].last_stars_claimed_at.getTime();

                // if (elapsed < 2 * 60 * 60 * 1000) {
                //     const remaining = Math.ceil(
                //         (2 * 60 * 60 * 1000 - elapsed) / (60 * 1000)
                //     );

                //     await ctx.reply(
                //         new I18n(
                //             Infrastructure.messages["claimRemaining"]?.[lang] ?? "Something went wrong",
                //             {
                //                 remaining: String(remaining)
                //             }
                //         ).text
                //     );

                //     return;
                // }

                const starsClaimed = await this.claimStars(client, ctx);

                await ctx.reply(
                    new I18n(
                        Infrastructure.messages["claim"]?.[lang] ?? "Something went wrong",
                        {
                            stars:    String(starsClaimed!),
                            oldStars: user.rows[0].stars,
                            newStars: String(Number(user.rows[0].stars) + starsClaimed!)
                        }
                    ).text
                );
            });
        } catch (error) {
            console.error(error)
            await ctx.reply(
                "Something went wrong"
            );
        }
    }
}

export class Pvp extends Command {
    async handler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

        try {
            if (!await this.userExists(ctx)) await this.addUser(ctx);
        } catch (error) {
            console.error(error);
            
            await ctx.reply(
                "Something went wrong"
            );

            return;
        }

        const args = ctx.message?.text?.split(" ")!;

        if (args.length != 2) {
            await ctx.reply(
                new I18n(
                    Infrastructure.messages["pvpInvalidArg"]?.[lang] ?? "Something went wrong",
                    {}
                ).text
            );

            return;
        }

        const amount = Number(args[1]);

        if (Number.isNaN(amount)) {
            await ctx.reply(
                new I18n(
                    Infrastructure.messages["pvpInvalidAmount"]?.[lang] ?? "Something went wrong",
                    {}
                ).text
            );

            return;
        }

        if (!Number.isInteger(amount)) {
            await ctx.reply(
                new I18n(
                    Infrastructure.messages["pvpFloatAmount"]?.[lang] ?? "Something went wrong",
                    {}
                ).text
            );

            return;
        }

        if (amount < 1) {
            await ctx.reply(
                new I18n(
                    Infrastructure.messages["pvpInvalidAmountRange"]?.[lang] ?? "Something went wrong",
                    {}
                ).text
            );

            return;
        }

        const pvpUuid = randomUUID();
        
        try {
            await Infrastructure.database.transaction(async (client: PoolClient) => {
                const user = await client.query<{
                    uuid: string,
                    stars: string
                }>(
                    `
                        SELECT uuid, stars FROM users WHERE user_id = $1 
                    `,
                    [
                        ctx.from?.id
                    ]
                );

                if (Number(user.rows[0]?.stars) < amount) {
                    await ctx.reply(
                        new I18n(
                            Infrastructure.messages["pvpInsufficientStars"]?.[lang] ?? "Something went wrong",
                            {
                                requiredStars: String(amount),
                                stars: user.rows[0]?.stars ?? "unknown"
                            }
                        ).text
                    );

                    return;
                }
                
                await client.query(
                    `
                        INSERT INTO pvps(
                            uuid,
                            creator_uuid,
                            amount
                        )
                        VALUES(
                            $1,
                            $2,
                            $3
                        )
                    `,
                    [
                        pvpUuid,
                        user.rows[0]?.uuid,
                        amount
                    ]
                );
    
                const keyboard = new InlineKeyboard()
                    .text(
                        new I18n(
                            Infrastructure.messages["pvpAccept"]?.[lang] ?? "Something went wrong",
                            {}
                        ).text,
                        `accept_pvp_${pvpUuid}`
                    )
                    .row()
                    .text(
                        new I18n(
                            Infrastructure.messages["pvpCancel"]?.[lang] ?? "Something went wrong",
                            {}
                        ).text,
                        `cancel_pvp_${pvpUuid}`
                    )
    
                await ctx.reply(
                    new I18n(
                        Infrastructure.messages["pvpChallenge"]?.[lang] ?? "Something went wrong",
                        {
                            userId: String(ctx.from?.id),
                            firstName: ctx.from?.first_name!,
                            amount: String(amount)
                        }
                    ).text,
                    {
                        parse_mode: "HTML",
                        reply_markup: keyboard,
                    }
                );
            });
        } catch (error) {
            console.error(error);
            await ctx.reply(
                "Something went wrong"
            );
        }
    }
}
