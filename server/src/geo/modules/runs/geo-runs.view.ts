import type { GeoCombatantView, GeoHandCard, GeoLunchboxSlot, GeoRunView } from "@cozy/shared/geo";
import { CONTENT } from "../../content";
import { currentActor } from "../../engine/battle";
import { CORE_STATS } from "../../engine/engine.types";
import { statOf } from "../../engine/stats";
import type { RunRow } from "./geo-runs.types";

/** The item that plays a card, for the app's name and icon. */
function itemIdForCard(cardId: string): string {
    const item = Object.values(CONTENT.items).find((i) => i.kind === "card" && i.cardId === cardId);
    return item?.id ?? cardId;
}

/**
 * A Run as the app sees it: health, statuses, the hand. Enemy rules and the
 * RNG stay on the server.
 */
export function toRunView(row: RunRow): GeoRunView {
    const { state } = row;

    const combatants: GeoCombatantView[] = state.combatants.map((c) => {
        const enemyIndex = c.side === "enemy" ? Number(c.id.split(":")[1]) : -1;
        const enemyId = row.enemy_ids[enemyIndex];
        return {
            id: c.id,
            side: c.side,
            name: c.name,
            sprite: enemyId ? CONTENT.enemies[enemyId]?.sprite : undefined,
            health: c.health,
            maxHealth: statOf(c, CORE_STATS.maxHealth, CONTENT),
            guard: c.guard,
            barrier: c.barrier ?? 0,
            statuses: c.statuses.map((s) => ({ ...s })),
        };
    });

    const player = state.combatants.find((c) => c.side === "player");
    const hand: GeoHandCard[] = (player?.hand ?? []).map((card) => ({
        inventoryId: card.instanceId,
        itemId: itemIdForCard(card.cardId),
        cardId: card.cardId,
        chargesLeft: card.chargesLeft,
    }));

    const lunchbox: GeoLunchboxSlot[] = (player?.lunchbox ?? [])
        .filter((entry) => entry.quantity > 0)
        .map((entry) => ({ slot: entry.slot, itemId: entry.foodId, quantity: entry.quantity }));

    return {
        id: row.id,
        kind: row.kind,
        status: row.status,
        round: state.round,
        order: state.order,
        currentActor: row.status === "active" ? (currentActor(state)?.id ?? null) : null,
        combatants,
        hand,
        lunchbox,
        // Runs won before chests existed were saved without them.
        rewards: row.rewards && { ...row.rewards, chests: row.rewards.chests ?? null },
        coinsLost: row.coins_lost === null ? null : Number(row.coins_lost),
        enemyLeft: row.status === "defeat" && row.enemy_ids.some((id) => CONTENT.enemies[id]?.leavesAfterWinning),
    };
}
