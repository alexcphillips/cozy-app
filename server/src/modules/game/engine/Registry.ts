import { GAME_MESSAGES } from "../game.messages";
import type { BaseContent } from "../models/base-content.model";
import type { System } from "../models/system.model";

export class Registry {
    private stores = new Map<System, Map<string, BaseContent>>();

    register(def: BaseContent) {
        if (!this.stores.has(def.system)) {
            this.stores.set(def.system, new Map());
        }

        const store = this.stores.get(def.system)!;

        if (store.has(def.id)) {
            throw new Error(
                `${GAME_MESSAGES.PREFIX_REGISTRY_ERROR} Duplicate id: ${def.id} in system ${def.system}`,
            );
        }

        store.set(def.id, def);
    }

    get<T extends BaseContent>(system: System, id: string): T {
        const store = this.stores.get(system);

        if (!store) {
            throw new Error(
                `${GAME_MESSAGES.PREFIX_REGISTRY_ERROR} Missing system: ${system}`,
            );
        }

        const def = store.get(id);

        if (!def) {
            throw new Error(
                `${GAME_MESSAGES.PREFIX_REGISTRY_ERROR} Missing definition: ${id} in ${system}`,
            );
        }

        return def as T;
    }

    getBySystem(system: System): BaseContent[] {
        return [...(this.stores.get(system)?.values() ?? [])];
    }

    has(system: System, id: string): boolean {
        return this.stores.get(system)?.has(id) ?? false;
    }
}
