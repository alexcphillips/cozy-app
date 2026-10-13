import {
    GEO_FARM_SIZE,
    type GeoCropView,
    type GeoFarmEventView,
    type GeoFarmContests,
    type GeoFarmGain,
    type GeoGlobalFarmEvent,
    type GeoFarmPestIntent,
    type GeoFarmView,
    type GeoFarmWeather,
    type GeoResearchLab,
    type GeoSeedBag,
} from "@cozy/shared/geo";
import { CONTENT, FARMING } from "../../content";
import { FARMING_CARDS, isFarmingCardId, type GrowsDef, type MutationRecipe } from "../../content/farming";
import type { WeatherLookup } from "../../farming/weather";
import {
    forecast,
    homeMovableAt,
    isRipe,
    isUnlockable,
    laborFor,
    nextLaborLevel,
    nextTurnAt,
    rotChance,
    tileXY,
    unlockCost,
    weekEndsAt,
    type FarmHandCard,
    type FarmState,
} from "../../farming/farm";

const where = (index: number) => {
    const { x, y } = tileXY(index);
    return `(${x + 1}, ${y + 1})`;
};

const growsDef = (id: string): GrowsDef | undefined => CONTENT.crops[id] ?? CONTENT.mutations[id];

const WEATHER_NAMES: Record<GeoFarmWeather, string> = { clear: "a Clear day", overcast: "an Overcast day", rain: "Rain", heatwave: "a Heatwave", storm: "a Storm", frost: "a Frost" };

/** "2 ripe Wheat next to an empty tile, on a Heatwave, with a Field Mouse near". */
export function recipeText(recipe: MutationRecipe): string {
    const parents = recipe.parents
        .map((parent) => `${parent.count > 1 ? `${parent.count} ` : ""}ripe ${CONTENT.crops[parent.cropId]?.name ?? parent.cropId}`)
        .join(" and ");
    const parts = [`${parents} next to an empty tile`];
    if (recipe.weather) parts.push(`on ${WEATHER_NAMES[recipe.weather]}`);
    if (recipe.pest) parts.push(`with a ${CONTENT.pests[recipe.pest]?.name ?? recipe.pest} on or beside it`);
    if (recipe.minFertility !== undefined) parts.push(`fertility ${recipe.minFertility}+`);
    return parts.join(", ");
}

/** The Research Lab: what's been found, and what could be turned in from what the player holds. */
function toLab(state: FarmState, held: Record<string, number>): GeoResearchLab {
    const mutations = Object.values(CONTENT.mutations);
    return {
        found: state.lab.flatMap((id) => {
            const mutation = CONTENT.mutations[id];
            if (!mutation) return [];
            const { name, icon, description, produce } = mutation;
            return [{ mutationId: id, name, icon, description, produceItemId: produce, recipe: recipeText(mutation.recipe) }];
        }),
        total: mutations.length,
        ready: mutations
            .filter((mutation) => !state.lab.includes(mutation.id) && (held[mutation.produce] ?? 0) > 0)
            .map((mutation) => ({ mutationId: mutation.id, itemId: mutation.produce, ...mutation.research })),
    };
}

/** Crops to draw and plan with: every plain crop, and the mutations found or growing here. */
function cropViews(state: FarmState): GeoCropView[] {
    const growing = new Set(state.tiles.flatMap((tile) => (tile.crop ? [tile.crop.cropId] : [])));
    const mutations = Object.values(CONTENT.mutations).filter((mutation) => state.lab.includes(mutation.id) || growing.has(mutation.id));
    return [
        ...Object.values(CONTENT.crops).map((crop) => ({
            id: crop.id,
            name: crop.name,
            icon: crop.icon,
            seedItemId: crop.seed,
            produceItemId: crop.produce,
            stages: crop.stages,
            mutation: false,
        })),
        ...mutations.map((mutation) => ({
            id: mutation.id,
            name: mutation.name,
            icon: mutation.icon,
            seedItemId: null,
            produceItemId: mutation.produce,
            stages: mutation.stages,
            mutation: true,
        })),
    ];
}

/** A pest's next move in words, naming the crop it's after as things stand. */
function intentText(state: FarmState, from: number, intent: GeoFarmPestIntent): string {
    const crop = state.tiles[intent.tile]?.crop;
    const cropName = crop ? (growsDef(crop.cropId)?.name ?? "crop") : null;
    switch (intent.kind) {
        case "eat":
            if (!cropName) return `Goes for ${where(intent.tile)}, but nothing grows there now`;
            return intent.tile === from ? `Eats the ${cropName} here` : `Moves to ${where(intent.tile)} and eats the ${cropName}`;
        case "move":
            return intent.tile === from ? "Sits tight" : `Moves to ${where(intent.tile)}`;
        case "drain":
            return `Drains ${intent.amount} fertility here`;
        case "sap":
            return cropName ? `Saps the ${cropName}: it won't grow` : "Sits tight";
        case "breed":
            return `Breeds onto ${where(intent.tile)}`;
    }
}

/** A farm event as the app shows it. */
function eventView(eventId: string | null, offers: GeoFarmEventView["offers"]): GeoFarmEventView | null {
    const event = eventId ? CONTENT.farmEvents[eventId] : undefined;
    if (!event) return null;
    return { id: event.id, name: event.name, icon: event.icon, description: event.description, offers };
}

/** Where the farm's weather comes from, for the forecast. */
export type FarmWeather = { lookup: WeatherLookup; source: "real" | "placeholder" };

/** What the last action did, for the reply. */
export type FarmReport = { log: string[]; gained: GeoFarmGain[]; xpGained: number };

const NO_REPORT: FarmReport = { log: [], gained: [], xpGained: 0 };

/** The farm as the app sees it: every tile, the clock, the hand and the Seed Bag. */
/** Everything a farm view needs besides the farm itself, loaded by the repository. */
export type FarmViewExtras = {
    hand: FarmHandCard[];
    seedBag: GeoSeedBag;
    /** How many of each item the player holds, for the Research Lab and structures. */
    held: Record<string, number>;
    weather: FarmWeather;
    contests: GeoFarmContests;
    global: GeoGlobalFarmEvent | null;
    farmingLevel: number;
};

export function toFarmView(state: FarmState, { hand, seedBag, held, weather, contests, global, farmingLevel }: FarmViewExtras, report: FarmReport = NO_REPORT): GeoFarmView {
    const next = nextTurnAt(state, FARMING);
    return {
        size: GEO_FARM_SIZE,
        tiles: state.tiles.map((tile, index) => {
            const def = tile.crop ? growsDef(tile.crop.cropId) : undefined;
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
                trap: tile.trap,
                pollinated: tile.pollinated,
                structure: tile.structure,
                waste: tile.waste,
                soil: tile.soil,
                soilOverlay: tile.soilOverlay,
            };
        }),
        turn: state.turn,
        labor: state.labor,
        laborPerTurn: laborFor(FARMING, farmingLevel),
        laborNextLevel: nextLaborLevel(FARMING, farmingLevel),
        turnsBanked: state.turnsBanked,
        maxTurnsBanked: FARMING.maxTurnsBanked,
        nextTurnAt: next ? next.toISOString() : null,
        forecast: forecast(state, FARMING, weather.lookup),
        events: {
            next: eventView(state.nextEvent, []),
            active: state.activeEvent ? eventView(state.activeEvent.eventId, state.activeEvent.offers) : null,
        },
        global,
        contests,
        amendments: FARMING.soil.amendments,
        blessings: state.blessings.flatMap((blessing) => {
            const def = FARMING.shrine.blessings.find((entry) => entry.id === blessing.id);
            return def ? [{ id: def.id, name: def.name, description: def.description, curse: def.curse, turnsLeft: blessing.turnsLeft }] : [];
        }),
        orders: {
            orders: state.orders?.list ?? [],
            endsAt: weekEndsAt(state.orders?.week ?? 0).toISOString(),
        },
        weather: {
            source: weather.source,
            home: state.home ? { latitude: state.home.latitude, longitude: state.home.longitude } : null,
            canMoveAt: homeMovableAt(state, FARMING, new Date())?.toISOString() ?? null,
            regionDegrees: FARMING.weather.regionDegrees,
        },
        unlockCost: unlockCost(state, FARMING),
        hand: hand.flatMap((card) =>
            isFarmingCardId(card.cardId) ? [{ ...card, labor: FARMING_CARDS[card.cardId].labor, shape: FARMING_CARDS[card.cardId].shape }] : [],
        ),
        seedBag,
        crops: cropViews(state),
        pests: state.pests.map((pest) => ({
            id: pest.id,
            pestId: pest.pestId,
            tile: pest.tile,
            intent: pest.intent,
            intentText: intentText(state, pest.tile, pest.intent),
            hp: pest.hp ?? 1,
        })),
        pestTypes: Object.values(CONTENT.pests).map(({ id, name, icon, description, likes, bounty }) => ({ id, name, icon, description, likes, bounty })),
        lab: toLab(state, held),
        pesthunter: { points: state.pesthunterPoints, shop: FARMING.pesthunter.shop },
        structureTypes: Object.values(CONTENT.structures).map(({ id, name, icon, description, itemId, effect }) => ({
            id,
            kind: effect.kind,
            name,
            icon,
            description,
            itemId,
        })),
        structureKit: Object.values(CONTENT.structures).flatMap((structure) => {
            const quantity = held[structure.itemId] ?? 0;
            return quantity > 0 ? [{ structureId: structure.id, itemId: structure.itemId, quantity }] : [];
        }),
        log: report.log,
        gained: report.gained,
        xpGained: report.xpGained,
    };
}
