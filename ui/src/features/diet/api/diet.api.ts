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

    createFoodItem(input: CreateFoodItemRequest): Promise<FoodItem> {
        return api.post<FoodItem>(API_PATHS.diet.foodItems_create, input);
    },

    listFoodLog(localDate: string): Promise<FoodLogEntry[]> {
        return api.get<FoodLogEntry[]>(API_PATHS.diet.foodLog, {
            localDate,
        });
    },

    createFoodLog(input: CreateFoodLogRequest): Promise<unknown> {
        return api.post(API_PATHS.diet.foodLog, input);
    },

    deleteFoodLogItem(itemId: string): Promise<unknown> {
        return api.delete(buildPath(API_PATHS.diet.foodLogItem, { itemId }));
    },
};
