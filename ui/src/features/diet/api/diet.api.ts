import {
    API_PATHS,
    buildPath,
    type CreateFoodItemRequest,
    type CreateFoodLogRequest,
    type CreateWeightEntryRequest,
    type FoodItem,
    type FoodLogEntry,
    type WeightEntry,
} from "@cozy/shared";
import { api } from "../../../lib/api";

/** Every diet endpoint this feature can reach. Nothing else calls them. */
export const dietApi = {
    listWeightEntries(): Promise<WeightEntry[]> {
        return api.get<WeightEntry[]>(API_PATHS.diet.weightEntries);
    },

    createWeightEntry(input: CreateWeightEntryRequest): Promise<WeightEntry> {
        return api.post<WeightEntry>(API_PATHS.diet.weightEntries, input);
    },

    listFoodItems(): Promise<FoodItem[]> {
        return api.get<FoodItem[]>(API_PATHS.diet.foodItems);
    },

    createFoodItem(log: CreateFoodItemRequest): Promise<FoodItem> {
        console.log("create item:", log);
        if (log.iAteThisToday)
            log.localDate = Intl.DateTimeFormat("sv-SE").format(new Date());
        return api.post<FoodItem>(API_PATHS.diet.foodItems_create, log);
    },

    listFoodLog(localDate: string): Promise<FoodLogEntry[]> {
        return api.get<FoodLogEntry[]>(API_PATHS.diet.foodLog, {
            localDate,
        });
    },

    createFoodLog(log: CreateFoodLogRequest): Promise<unknown> {
        log.localDate = new Intl.DateTimeFormat("sv-SE").format(new Date());
        return api.post(API_PATHS.diet.foodLog, log);
    },

    deleteFoodLogItem(itemId: string): Promise<unknown> {
        return api.delete(buildPath(API_PATHS.diet.foodLogItem, { itemId }));
    },
};
