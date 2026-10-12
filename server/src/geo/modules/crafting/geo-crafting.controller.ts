import type { Request, Response } from "express";
import { GEO_CRAFT_MAX_QUANTITY, type GeoCraftRequest } from "@cozy/shared/geo";
import { AppError } from "../../../http/AppError";
import { CONTENT } from "../../content";
import { withTransaction } from "../../db/transaction";
import { requirePlayerId } from "../../middleware/geo-auth";
import * as playerRepository from "../player/geo-player.repository";

/** "combat" → "Combat", for refusals the player reads. */
const skillName = (skill: string) => skill.charAt(0).toUpperCase() + skill.slice(1);

function readQuantity(value: unknown): number {
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1 || value > GEO_CRAFT_MAX_QUANTITY) {
        throw AppError.badRequest(`Choose between 1 and ${GEO_CRAFT_MAX_QUANTITY}`);
    }
    return value;
}

/**
 * Crafts a recipe `quantity` times, in one transaction: the skill levels are
 * checked, every input is taken (refusing, with nothing taken, if any falls
 * short), and only then is the output handed over.
 */
export async function craft(req: Request, res: Response) {
    const playerId = requirePlayerId(req);
    const recipe = CONTENT.recipes[String(req.params.recipeId)];
    if (!recipe) throw AppError.notFound("No such recipe");
    const { quantity } = (req.body ?? {}) as Partial<GeoCraftRequest>;
    const times = readQuantity(quantity);

    await withTransaction(async (tx) => {
        const levels = await playerRepository.findSkillLevels(tx, playerId);
        for (const { skill, level } of recipe.skills ?? []) {
            if ((levels[skill] ?? 1) < level) throw AppError.badRequest(`Needs ${skillName(skill)} level ${level}`);
        }
        for (const input of recipe.inputs) {
            await playerRepository.takeItems(tx, playerId, input.itemId, input.quantity * times);
        }
        await playerRepository.grantItems(tx, playerId, [
            { itemId: recipe.output.itemId, quantity: recipe.output.quantity * times },
        ]);
    });

    res.status(200).json(await playerRepository.findMe(playerId));
}
