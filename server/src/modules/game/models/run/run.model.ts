import type { RunState } from "./run-state.model";
import type { RunStatus } from "./run-status.model";

export interface Run {
    id: string;
    system: "fishing" | "combat" | "mining";
    playerIds: string[];
    status: RunStatus;
    startedAt: number;
    endedAt?: number;
    state: RunState;
}
