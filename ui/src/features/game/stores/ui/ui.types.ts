export type MenuPanel =
    | "inventory"
    | "deck"
    | "settings"
    | "help"
    | "achievements"
    | "skills";

export type Hotspot =
    | "castle"
    | "forest"
    | "portal"
    | "tower"
    | "bonfire"
    | "port"
    | "mine"
    | "farm"
    | "town";

export type HotspotView =
    | "castle"
    | "castle_dungeons"
    | "castle_training"
    | "port"
    | "port_fishing"
    | "port_shipbuilding"
    | "forest"
    | "tower"
    | "bonfire"
    | "mine"
    | "farm"
    | "town"
    | "museum"
    | "guild_hall"
    | "auction_house"
    | "community_center"
    | "bank"
    | "portal";

export type GameLocation =
    | "Port"
    | "Castle"
    | "Forest"
    | "Bonfire"
    | "Portal"
    | "Town"
    | "Farm";

export type ActivePanel =
    | { kind: "menu"; panel: MenuPanel }
    | { kind: "hotspot"; panel: HotspotView }
    | null;

export type WorldMode =
    | "main"
    | "shipbuilding"
    | "combat"
    | "run_fishing"
    | "dungeon";

export type GameAction =
    | { type: "OPEN_MENU"; panel: MenuPanel }
    | { type: "OPEN_HOTSPOT"; panel: HotspotView }
    | { type: "SET_WORLD_MODE"; mode: WorldMode }
    | { type: "START_RUN"; runType: string }
    | { type: "CLOSE_UI" }
    | { type: "SEND_SOCKET_EVENT"; event: string; payload?: unknown };
