import { GEO_FARM_SIZE, type GeoFarmGain, type GeoFarmView, type GeoSeedBag } from "@cozy/shared/geo";
import { CONTENT, FARMING } from "../../content";
import { FARMING_CARDS, isFarmingCardId } from "../../content/farming";
import {
    forecast,
    isRipe,
    isUnlockable,
    nextTurnAt,
    rotChance,
    tileXY,
    unlockCost,
    type FarmHandCard,
    type FarmState,
} from "../../farming/farm";

/** What the last action did, for the reply. */
export type FarmReport = { log: string[]; gained: GeoFarmGain[]; xpGained: number };

const NO_REPORT: FarmReport = { log: [], gained: [], xpGained: 0 };

/** The farm as the app sees it: every tile, the clock, the hand and the Seed Bag. */
export function toFarmView(state: FarmState, hand: FarmHandCard[], seedBag: GeoSeedBag, report: FarmReport = NO_REPORT): GeoFarmView {
    const next = nextTurnAt(state, FARMING);
    return {
        size: GEO_FARM_SIZE,
        tiles: state.tiles.map((tile, index) => {
            const def = tile.crop ? CONTENT.crops[tile.crop.cropId] : undefined;
            return {
                index,
                ...tileXY(index),
                owned: tile.owned,
                unlockable: isUnlockable(state, index),
                crop:
                    tile.crop && def
                        ? {
                              cropId: def.id,
                              stage: tile.crop.stage,
                              stages: def.stages,
                              ripe: isRipe(tile.crop, def),
                              ripeTurns: tile.crop.ripeTurns,
                              rotChance: rotChance(tile.crop, def, FARMING),
                              held: tile.crop.held,
                              rotten: tile.crop.rotten,
                          }
                        : null,
                moisture: tile.moisture,
                soakTurns: tile.soakTurns,
                fertility: tile.fertility,
                blueprint: tile.blueprint,
            };
        }),
        turn: state.turn,
        labor: state.labor,
        laborPerTurn: FARMING.laborPerTurn,
        turnsBanked: state.turnsBanked,
        maxTurnsBanked: FARMING.maxTurnsBanked,
        nextTurnAt: next ? next.toISOString() : null,
        forecast: forecast(state, FARMING),
        unlockCost: unlockCost(state, FARMING),
        hand: hand.flatMap((card) =>
            isFarmingCardId(card.cardId) ? [{ ...card, labor: FARMING_CARDS[card.cardId].labor, shape: FARMING_CARDS[card.cardId].shape }] : [],
        ),
        seedBag,
        crops: Object.values(CONTENT.crops).map((crop) => ({
            id: crop.id,
            name: crop.name,
            icon: crop.icon,
            seedItemId: crop.seed,
            produceItemId: crop.produce,
            stages: crop.stages,
        })),
        log: report.log,
        gained: report.gained,
        xpGained: report.xpGained,
    };
}
