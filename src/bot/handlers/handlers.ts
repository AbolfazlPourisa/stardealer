import { InlineKeyboard } from "grammy";
import type { Context } from "../context.js";
import { Infrastructure } from "../../infrastructure/infrastructure.js";
import { I18n } from "../../i18n/i18n.js";
import { type PoolClient } from "pg";
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
                    username,
                    first_name,
                    stars
                )
                VALUES(
                    $1,
                    $2,
                    $3,
                    $4,
                    0
                )
            `,
            [
                randomUUID(),
                ctx.from?.id,
                ctx.from?.first_name,
                ctx.from?.username
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

    protected async syncUser(ctx: Context): Promise<void> {
        await Infrastructure.database.pool.query(
            `
                INSERT INTO users (
                    uuid,
                    user_id,
                    username,
                    first_name,
                    stars
                )
                VALUES (
                    $1, $2, $3, $4, 0
                )
                ON CONFLICT (user_id)
                DO UPDATE SET
                    username = EXCLUDED.username,
                    first_name = EXCLUDED.first_name
            `,
            [
                randomUUID(),
                ctx.from!.id,
                ctx.from!.username ?? null,
                ctx.from!.first_name
            ]
        );
    }
}

export class Start extends Command {
    async handler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

        try {
            await this.syncUser(ctx);

            await ctx.reply(
                new I18n(
                    Infrastructure.messages["start"]?.[lang] ?? "Something went wrong",
                    {}
                ).text
            );
        } catch (error) {
            console.error(error);
        }
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
            await this.syncUser(ctx);

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
    async cancelPvpHandler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

        try {
            await this.syncUser(ctx);

            if (!Array.isArray(ctx.match)) {
    
                return;
            }

            const pvpId = ctx.match[1];

            await Infrastructure.database.transaction(async (client: PoolClient) => {
                const result = await client.query<{
                    creator_uuid: string
                    pvp_status: "pending" | "canceled" | "finished"
                    user_uuid: string
                }>(
                    `
                        SELECT
                            pvps.creator_uuid,
                            pvps.pvp_status,
                            
                            u.uuid AS user_uuid
                        FROM pvps
                        JOIN users u
                            ON u.uuid = pvps.creator_uuid
                        where pvps.uuid = $1
                        FOR UPDATE OF pvps
                    `,
                    [
                        pvpId
                    ]
                );

                const pvp = result.rows[0]

                if (!pvp) {
                    await ctx.editMessageText(
                        new I18n(
                            Infrastructure.messages["pvpNotFound"]?.[lang] ?? "Something went wrong",
                            {}
                        ).text
                    );

                    return;
                }

                if (pvp.creator_uuid === pvp.user_uuid) {
                    await ctx.answerCallbackQuery(
                        {
                            text: new I18n(
                                Infrastructure.messages["pvpCancelUnauthorized"]?.[lang] ?? "Something went wrong",
                                {
                                }
                            ).text,
                            show_alert: true
                        }
                    );

                    return;
                }

                if (pvp.pvp_status !== "pending") {
                    await ctx.editMessageText(
                        new I18n(
                            Infrastructure.messages["pvpUnavailable"]?.[lang] ?? "Something went wrong",
                            {
                            }
                        ).text,
                    );

                    return;
                }

                await client.query(
                    `
                        UPDATE pvps
                        SET
                            pvp_status = 'canceled',
                            canceled_at = NOW()
                        WHERE uuid = $1
                    `,
                    [
                        pvpId
                    ]
                );

                await ctx.editMessageText(
                    new I18n(
                        Infrastructure.messages["pvpExpired"]?.[lang] ?? "Something went wrong",
                        {
                        }
                    ).text,
                );
            });
        } catch (error) {
            console.error(error)
            await ctx.answerCallbackQuery({
                text: "Something went wrong",
                show_alert: true
            });
        }
    }

    async acceptPvpHandler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

        try {
            await this.syncUser(ctx);

            if (!Array.isArray(ctx.match)) {
    
                return;
            }
    
            const pvpId = ctx.match[1];

            Infrastructure.database.transaction(async (client: PoolClient) => {
                const result = await client.query<{
                    amount: string,
                    pvp_status: "pending" | "canceled" | "finished" 
                    
                    creator_uuid: string
                    creator_user_id: string
                    creator_first_name: string | null
                    creator_stars: string

                    acceptor_uuid: string
                    acceptor_user_id: string
                    acceptor_first_name: string | null
                    acceptor_stars: string
                }>(
                    `
                        SELECT 
                            pvps.amount,
                            pvps.pvp_status,

                            creator.uuid AS creator_uuid,
                            creator.user_id AS creator_user_id,
                            creator.first_name AS creator_first_name,
                            creator.stars AS creator_stars,
                            
                            acceptor.uuid AS acceptor_uuid,
                            acceptor.user_id AS acceptor_user_id,
                            acceptor.first_name AS acceptor_first_name,
                            acceptor.stars AS acceptor_stars
                        
                        FROM pvps
                        JOIN users creator
                            ON creator.uuid = pvps.creator_uuid
                        JOIN users acceptor
                            ON acceptor.user_id = $1
                        WHERE pvps.uuid = $2
                        FOR UPDATE
                    `,
                    [
                        ctx.from!.id,
                        pvpId
                    ]
                );

                const pvp = result.rows[0];

                if (!pvp) {
                    await ctx.editMessageText(
                        new I18n(
                            Infrastructure.messages["pvpNotFound"]?.[lang] ?? "Something went wrong",
                            {}
                        ).text
                    );

                    return;
                }

                if (pvp.pvp_status != "pending") {
                    await ctx.editMessageText(
                        new I18n(
                            Infrastructure.messages["pvpUnavailable"]?.[lang] ?? "Something went wrong",
                            {}
                        ).text,                    
                    );

                    return;
                }

                if (pvp.creator_user_id === pvp.acceptor_user_id) {
                    await ctx.answerCallbackQuery(
                        {
                            text: new I18n(
                                Infrastructure.messages["pvpSelf"]?.[lang] ?? "Something went wrong",
                                {}
                            ).text,
                            show_alert: true
                        }
                    );

                    return;
                }

                if (Number(pvp.acceptor_stars) < Number(pvp.amount)) {
                    await ctx.answerCallbackQuery(
                        {
                            text: new I18n(
                                Infrastructure.messages["pvpAcceptorInsufficientStars"]?.[lang] ?? "Something went wrong",
                                {
                                    stars: pvp.acceptor_stars,
                                    requiredStars: pvp.amount
                                }
                            ).text,
                            show_alert: true
                        }
                    );

                    return;
                }

                if (Number(pvp.creator_stars) < Number(pvp.amount)) {
                    await ctx.answerCallbackQuery(
                        {
                            text: new I18n(
                                Infrastructure.messages["pvpCreatorInsufficientStars"]?.[lang] ?? "Something went wrong",
                                {
                                    stars: pvp.creator_stars,
                                    requiredStars: pvp.amount
                                }
                            ).text,
                            show_alert: true
                        }
                    );

                    return;
                }

                const creator = {
                    uuid: pvp.creator_uuid,
                    userId: pvp.creator_user_id,
                    firstName: pvp.creator_first_name,
                    stars: pvp.creator_stars
                };

                const acceptor = {
                    uuid: pvp.acceptor_uuid,
                    userId: pvp.acceptor_user_id,
                    firstName: pvp.acceptor_first_name,
                    stars: pvp.acceptor_stars
                };

                const [winner, loser] = Math.random() < 0.5
                    ? [creator, acceptor]
                    : [acceptor, creator];

                await client.query(
                    `
                        UPDATE pvps
                        SET
                            acceptor_uuid = $1,
                            pvp_status = 'finished',
                            winner_uuid = $2,
                            loser_uuid = $3,
                            accepted_at = NOW()
                        WHERE uuid = $4
                    `,
                    [
                        acceptor.uuid,
                        winner.uuid,
                        loser.uuid,
                        pvpId
                    ]
                );
                
                await ctx.editMessageText(
                    new I18n(
                    Infrastructure.messages["pvpResult"]?.[lang] ?? "Something went wrong",
                        {
                            amount: pvp.amount,
                            winnerId: winner.userId,
                            winnerName: winner.firstName ?? "unknown",
                            winnerOldStars: winner.stars,
                            winnerNewStars: String(Number(winner.stars) + Number(pvp.amount)),
                            loserId: loser.userId,
                            loserName: loser.firstName ?? "unknown",
                            loserOldStars: loser.stars,
                            loserNewStars: String(Number(loser.stars) - Number(pvp.amount)),
                        }
                    ).text
                );
            });
        } catch (error) {
            console.error(error)
            await ctx.answerCallbackQuery({
                text: "Something went wrong",
                show_alert: true
            });
        }
    }

    async handler(ctx: Context): Promise<void> {
        const lang = ctx.lang;

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
            await this.syncUser(ctx);

            await Infrastructure.database.transaction(async (client: PoolClient) => {
                const user = await client.query<{
                    uuid: string,
                    stars: string
                }>(
                    `
                        SELECT uuid, stars FROM users WHERE user_id = $1 FOR UPDATE 
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
