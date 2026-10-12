/**
 * NPC vendors. Each sells a fixed list and buys what its rule accepts, at the
 * item's sell value (`GeoItemView.sellValue`) — the same number that is the
 * item's lowest Market price.
 */

export type GeoVendorOffer = {
    itemId: string;
    /** Coins per unit. */
    price: number;
    /** Units left; null is unlimited. */
    stock: number | null;
};

/** One item a vendor will buy, and what it pays per unit. */
export type GeoVendorBuyOffer = {
    itemId: string;
    price: number;
};

export type GeoVendor = {
    id: string;
    name: string;
    /** A Game Icons name. */
    icon: string;
    description: string;
    /** What the player can buy here. */
    sells: GeoVendorOffer[];
    /** Every item this vendor buys from players. */
    buys: GeoVendorBuyOffer[];
};

/** `GET /geo/vendors`. */
export type GeoVendorsResponse = {
    vendors: GeoVendor[];
};

/** `POST /geo/vendors/:vendorId/buy`. Replies with the player (`GeoMeResponse`). */
export type GeoVendorBuyRequest = {
    itemId: string;
    quantity: number;
};

/** `POST /geo/vendors/:vendorId/sell`. Replies with the player (`GeoMeResponse`). */
export type GeoVendorSellRequest = {
    inventoryId: string;
    quantity: number;
};

/** Most units one buy or sell may move. */
export const GEO_VENDOR_MAX_QUANTITY = 999;
