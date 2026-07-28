import type { BaseContent } from "../base-content.model";

export interface Quest extends BaseContent {
    system: "quest";
    objectives: {
        type: "catch" | "defeat" | "collect";
        target: string;
        count: number;
    }[];
}
