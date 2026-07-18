import type { System } from "./system.model";

export interface BaseContent {
    id: string;
    system: System;
    name: string;
    description: string;
    tags: string[];
}
