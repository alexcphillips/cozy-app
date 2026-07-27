export interface CardEffect {
    id: string; // references effect registry
    params?: Record<string, number | string | boolean>;
    condition?: string; // optional future hook
    delay?: number;
}
