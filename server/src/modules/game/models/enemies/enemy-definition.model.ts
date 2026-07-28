import type { BaseContent } from "../base-content.model";

export interface EnemyDefinition extends BaseContent {
    system: "enemy";
    spawnSource: "fishing" | "combat" | "dungeon" | "event";
    behavior: {
        aggression: number;
        pattern: "aggressive" | "defensive" | "ambush";
    };
    stats: {
        health: number;
        damage?: number;
    };
}
