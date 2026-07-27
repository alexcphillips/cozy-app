export interface Merchant {
    id: string;
    name: string;
    system: "merchant";
    buys: {
        tags?: string[];
        itemTypes?: string[];
        systems?: string[]; // usually just ["item"]
    };
    sells?: {
        itemPools?: string[];
    };
    pricing: {
        buyMultiplier: number; // player sells to merchant
        sellMultiplier: number; // player buys from merchant
    };
    availability?: {
        unlockQuestId?: string;
        requiredSkill?: string;
    };
}
