import { api } from "@/lib/api";
import { API_PATHS, type CashFlow } from "@cozy/shared";

export const financialApi = {
    getCashFlow(): Promise<CashFlow[]> {
        return api.get(API_PATHS.finance.cashFlow);
    },
};
