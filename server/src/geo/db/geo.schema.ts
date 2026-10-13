import { query } from "../../db";

/**
 * geo-game's tables, all in their own `geo` Postgres schema inside cozy-app's
 * database: one database to run, but nothing named alongside cozy-app's own
 * tables. Run once at boot, after cozy-app's `ensureSchema`.
 *
 * Same rule as cozy-app's schema: idempotent and additive only. Introduce
 * real migrations before the first destructive change.
 */
export async function ensureGeoSchema(): Promise<void> {
    await query(`CREATE SCHEMA IF NOT EXISTS geo;`);
    for (const statement of STATEMENTS) await query(statement);
}

const STATEMENTS = [
    // An anonymous player, created from the phone. Coins live here; every
    // change to them also writes a coin_ledger row.
    `CREATE TABLE IF NOT EXISTS geo.players (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        display_name VARCHAR(40) NOT NULL DEFAULT 'Adventurer',
        coins BIGINT NOT NULL DEFAULT 0 CHECK (coins >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    // Bag pages are bought from a vendor; everyone starts with one.
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS talisman_bag_pages INTEGER NOT NULL DEFAULT 1
        CHECK (talisman_bag_pages >= 1);`,

    // A player is its own account: email and password are geo-game's, apart
    // from cozy-app's users. Players from before that (anonymous device ones,
    // then ones tied to a cozy-app user) are deleted: dev data only, nothing
    // was in production.
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS email VARCHAR(255);`,
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS password_hash TEXT;`,
    `DELETE FROM geo.players WHERE email IS NULL OR password_hash IS NULL;`,
    `ALTER TABLE geo.players ALTER COLUMN email SET NOT NULL;`,
    `ALTER TABLE geo.players ALTER COLUMN password_hash SET NOT NULL;`,
    `ALTER TABLE geo.players DROP COLUMN IF EXISTS user_id;`,
    // Case-insensitive: "Me@x.com" and "me@x.com" are one account, and two
    // players can't both be "Ash" and "ash".
    `CREATE UNIQUE INDEX IF NOT EXISTS players_email_key ON geo.players (lower(email));`,
    `CREATE UNIQUE INDEX IF NOT EXISTS players_display_name_key ON geo.players (lower(display_name));`,
    // Game admin, separate from cozy-app's users.is_admin.
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'player'
        CHECK (role IN ('player', 'admin'));`,
    // Set by an admin: every request is refused while it is.
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS banned_at TIMESTAMPTZ;`,

    // Hashes only: a leaked table can't be used to sign in.
    `CREATE TABLE IF NOT EXISTS geo.refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        token_hash CHAR(64) NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        expires_at TIMESTAMPTZ NOT NULL,
        revoked_at TIMESTAMPTZ
    );`,

    // One row per owned copy, or per stack for materials. `item_id` is a
    // content id (server/src/geo/content), not a foreign key: content lives
    // in code.
    `CREATE TABLE IF NOT EXISTS geo.inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        item_id VARCHAR(80) NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        charges_left INTEGER CHECK (charges_left >= 0),
        obtained_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS inventory_player_idx ON geo.inventory (player_id);`,

    `CREATE TABLE IF NOT EXISTS geo.equipment (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        slot VARCHAR(20) NOT NULL,
        inventory_id UUID NOT NULL UNIQUE REFERENCES geo.inventory(id) ON DELETE CASCADE,
        PRIMARY KEY (player_id, slot)
    );`,

    // Talismans count only while in the bag, and only one copy of each: the
    // primary key on item_id is what stops duplicates.
    `CREATE TABLE IF NOT EXISTS geo.talisman_bag (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        item_id VARCHAR(80) NOT NULL,
        inventory_id UUID NOT NULL UNIQUE REFERENCES geo.inventory(id) ON DELETE CASCADE,
        PRIMARY KEY (player_id, item_id)
    );`,

    // The current hand per skill, as inventory ids in hand order.
    `CREATE TABLE IF NOT EXISTS geo.hands (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        skill VARCHAR(30) NOT NULL,
        inventory_ids UUID[] NOT NULL DEFAULT '{}',
        PRIMARY KEY (player_id, skill)
    );`,

    // Lunchbox slots unlocked: 1 to start, up to 4 (GEO_LUNCHBOX_MAX_SLOTS).
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS lunchbox_slots INTEGER NOT NULL DEFAULT 1
        CHECK (lunchbox_slots BETWEEN 1 AND 4);`,

    // Food packed for Runs, one stack of one food per slot. Packing moves the
    // food out of geo.inventory (unpacking puts it back), so packed food can't
    // be sold, listed or crafted. The unique index keeps one slot per food.
    `CREATE TABLE IF NOT EXISTS geo.lunchbox (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        slot SMALLINT NOT NULL CHECK (slot >= 0 AND slot < 4),
        item_id VARCHAR(80) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        PRIMARY KEY (player_id, slot)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS lunchbox_one_slot_per_food_idx ON geo.lunchbox (player_id, item_id);`,

    // Bait slots unlocked: 1 to start, up to 4 (GEO_BAIT_MAX_SLOTS).
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS bait_slots INTEGER NOT NULL DEFAULT 1
        CHECK (bait_slots BETWEEN 1 AND 4);`,

    // Bait packed for fishing Runs, kept like geo.lunchbox: one stack of one
    // bait per slot, moved out of geo.inventory while packed.
    `CREATE TABLE IF NOT EXISTS geo.bait (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        slot SMALLINT NOT NULL CHECK (slot >= 0 AND slot < 4),
        item_id VARCHAR(80) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        PRIMARY KEY (player_id, slot)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS bait_one_slot_per_bait_idx ON geo.bait (player_id, item_id);`,

    `CREATE TABLE IF NOT EXISTS geo.skill_xp (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        skill VARCHAR(30) NOT NULL,
        xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
        PRIMARY KEY (player_id, skill)
    );`,

    // A Run's whole battle lives in `state` between turns.
    `CREATE TABLE IF NOT EXISTS geo.runs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        kind VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        enemy_ids TEXT[] NOT NULL DEFAULT '{}',
        state JSONB NOT NULL,
        rewards JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at TIMESTAMPTZ
    );`,
    `ALTER TABLE geo.runs ADD COLUMN IF NOT EXISTS spawn_id VARCHAR(80);`,
    // What a defeat cost: every coin carried.
    `ALTER TABLE geo.runs ADD COLUMN IF NOT EXISTS coins_lost BIGINT;`,
    // At most one Run in progress per player.
    `CREATE UNIQUE INDEX IF NOT EXISTS runs_one_active_idx
        ON geo.runs (player_id) WHERE status = 'active';`,

    // Each player's spawns, made around them by GET /geo/world and kept only
    // while they last (geo/world/spawns.ts). A beaten one keeps its slot,
    // marked claimed, until it would have despawned.
    `CREATE TABLE IF NOT EXISTS geo.spawns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        enemy_id VARCHAR(80) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        despawns_at TIMESTAMPTZ NOT NULL,
        claimed_at TIMESTAMPTZ
    );`,
    `CREATE INDEX IF NOT EXISTS spawns_player_idx ON geo.spawns (player_id);`,
    // When the player walked out of its reach; it despawns a little after.
    `ALTER TABLE geo.spawns ADD COLUMN IF NOT EXISTS out_of_reach_since TIMESTAMPTZ;`,
    // When it appeared; new spawns wait a gap after the newest one.
    `ALTER TABLE geo.spawns ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();`,
    // Where the player was last seen moving from, overwritten as they walk,
    // and the distance banked toward walking spawns (geo/world/travel.ts).
    // Only this one point is kept: no history.
    `CREATE TABLE IF NOT EXISTS geo.player_travel (
        player_id UUID PRIMARY KEY REFERENCES geo.players(id) ON DELETE CASCADE,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        seen_at TIMESTAMPTZ NOT NULL,
        banked_metres DOUBLE PRECISION NOT NULL DEFAULT 0
    );`,
    // When the player last got a spawn; the trickle's gap runs from here, so
    // an emptied map (walked or driven away from) isn't refilled at once.
    `ALTER TABLE geo.player_travel ADD COLUMN IF NOT EXISTS last_spawned_at TIMESTAMPTZ;`,
    // Replaced by geo.spawns: spawns were once generated per map cell.
    `DROP TABLE IF EXISTS geo.spawn_claims;`,

    // Named hands to swap back to, per skill.
    `CREATE TABLE IF NOT EXISTS geo.saved_hands (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        skill VARCHAR(30) NOT NULL,
        name VARCHAR(40) NOT NULL,
        inventory_ids UUID[] NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS saved_hands_player_idx ON geo.saved_hands (player_id, skill);`,

    // Every coin movement, so a balance can always be explained.
    `CREATE TABLE IF NOT EXISTS geo.coin_ledger (
        id BIGSERIAL PRIMARY KEY,
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        delta BIGINT NOT NULL,
        reason VARCHAR(40) NOT NULL,
        reference VARCHAR(80),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    // Every change an admin makes, so a grant or a ban can always be explained.
    `CREATE TABLE IF NOT EXISTS geo.admin_actions (
        id BIGSERIAL PRIMARY KEY,
        admin_id UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        action VARCHAR(40) NOT NULL,
        target VARCHAR(80),
        details JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS coin_ledger_created_idx ON geo.coin_ledger (created_at);`,
    `CREATE INDEX IF NOT EXISTS coin_ledger_player_idx ON geo.coin_ledger (player_id, created_at);`,

    // The Market. A listing holds its item in escrow: the item leaves the
    // seller's inventory before the listing row exists (same transaction),
    // and comes back (same id, same obtained date) if it's cancelled or
    // expires unsold. Coins a listing earns wait in `proceeds` until the
    // seller collects them.
    `CREATE TABLE IF NOT EXISTS geo.market_listings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        seller_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL CHECK (type IN ('auction', 'bin')),
        status VARCHAR(12) NOT NULL DEFAULT 'active'
            CHECK (status IN ('active', 'sold', 'cancelled', 'expired', 'removed')),
        item_id VARCHAR(80) NOT NULL,
        source_inventory_id UUID,
        charges_left INTEGER,
        obtained_at TIMESTAMPTZ NOT NULL,
        quantity_listed INTEGER NOT NULL CHECK (quantity_listed > 0),
        quantity_left INTEGER NOT NULL CHECK (quantity_left >= 0 AND quantity_left <= quantity_listed),
        unit_price BIGINT CHECK (unit_price > 0),
        starting_bid BIGINT CHECK (starting_bid > 0),
        current_bid BIGINT,
        leading_bidder_id UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        bid_count INTEGER NOT NULL DEFAULT 0,
        ends_at TIMESTAMPTZ,
        fee_paid BIGINT NOT NULL DEFAULT 0,
        proceeds BIGINT NOT NULL DEFAULT 0 CHECK (proceeds >= 0),
        proceeds_collected BIGINT NOT NULL DEFAULT 0 CHECK (proceeds_collected <= proceeds),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at TIMESTAMPTZ,
        CHECK ((type = 'bin') = (unit_price IS NOT NULL)),
        CHECK ((type = 'auction') = (starting_bid IS NOT NULL AND ends_at IS NOT NULL))
    );`,
    `CREATE INDEX IF NOT EXISTS market_listings_active_idx
        ON geo.market_listings (type, item_id, unit_price, created_at) WHERE status = 'active';`,
    `CREATE INDEX IF NOT EXISTS market_listings_seller_idx ON geo.market_listings (seller_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS market_listings_ending_idx
        ON geo.market_listings (ends_at) WHERE status = 'active' AND type = 'auction';`,

    // A bid's coins leave the bidder when it's placed ('held'), and go back
    // when outbid ('returned') or to the seller when it wins ('won').
    `CREATE TABLE IF NOT EXISTS geo.market_bids (
        id BIGSERIAL PRIMARY KEY,
        listing_id UUID NOT NULL REFERENCES geo.market_listings(id) ON DELETE CASCADE,
        bidder_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        amount BIGINT NOT NULL CHECK (amount > 0),
        status VARCHAR(10) NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'returned', 'won')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS market_bids_listing_idx ON geo.market_bids (listing_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS market_bids_held_idx ON geo.market_bids (bidder_id) WHERE status = 'held';`,
    // At most one held bid per auction: the leading one.
    `CREATE UNIQUE INDEX IF NOT EXISTS market_bids_one_held_idx ON geo.market_bids (listing_id) WHERE status = 'held';`,

    // Who bought what from a listing. One row for a single item; a stack can
    // sell in many parts.
    `CREATE TABLE IF NOT EXISTS geo.market_sales (
        id BIGSERIAL PRIMARY KEY,
        listing_id UUID NOT NULL REFERENCES geo.market_listings(id) ON DELETE CASCADE,
        buyer_id UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        paid BIGINT NOT NULL CHECK (paid >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS market_sales_listing_idx ON geo.market_sales (listing_id);`,

    // Mayor elections. One is open at a time; when it ends, its winner is the
    // mayor in office (the latest closed election's winner) and the next opens.
    `CREATE TABLE IF NOT EXISTS geo.elections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        candidate_ids TEXT[] NOT NULL,
        status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
        starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ends_at TIMESTAMPTZ NOT NULL,
        winner_id VARCHAR(80),
        closed_at TIMESTAMPTZ
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS elections_one_open_idx ON geo.elections ((status)) WHERE status = 'open';`,
    `CREATE INDEX IF NOT EXISTS elections_closed_idx ON geo.elections (closed_at) WHERE status = 'closed';`,

    // One vote per player per election, and no changing it: the primary key
    // refuses a second. `weight` is fixed when cast (1, or more with a
    // vote-weight talisman).
    `CREATE TABLE IF NOT EXISTS geo.election_votes (
        election_id UUID NOT NULL REFERENCES geo.elections(id) ON DELETE CASCADE,
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        candidate_id VARCHAR(80) NOT NULL,
        weight INTEGER NOT NULL CHECK (weight > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (election_id, player_id)
    );`,

    // Chests won together (a boss's), to open one of. Every chest's contents
    // are rolled at the win and kept in `chests`, so nothing rerolls; only
    // the opened one is ever shown. Pending while `opened_at` is null.
    // `cost` is kept per chest, fixed when won.
    `CREATE TABLE IF NOT EXISTS geo.chest_selections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        source_kind VARCHAR(20) NOT NULL,
        source_name VARCHAR(80) NOT NULL,
        run_id UUID UNIQUE REFERENCES geo.runs(id) ON DELETE SET NULL,
        chests JSONB NOT NULL,
        opened_index SMALLINT,
        opened_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK ((opened_index IS NULL) = (opened_at IS NULL))
    );`,
    `CREATE INDEX IF NOT EXISTS chest_selections_pending_idx
        ON geo.chest_selections (player_id, created_at) WHERE opened_at IS NULL;`,
    `CREATE INDEX IF NOT EXISTS chest_selections_opened_idx
        ON geo.chest_selections (player_id, opened_at) WHERE opened_at IS NOT NULL;`,

    // Players' suggestions that a real place should be a hub or point of
    // interest, for a game admin to review. A deleted player's suggestions
    // stay, unsigned. Where the player stood is kept beside the pin, so a
    // reviewer can tell whether they were actually there.
    `CREATE TABLE IF NOT EXISTS geo.location_suggestions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        kind VARCHAR(20) NOT NULL,
        latitude DOUBLE PRECISION NOT NULL,
        longitude DOUBLE PRECISION NOT NULL,
        note VARCHAR(280) NOT NULL DEFAULT '',
        player_latitude DOUBLE PRECISION NOT NULL,
        player_longitude DOUBLE PRECISION NOT NULL,
        gps_accuracy REAL,
        distance_metres REAL NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'accepted', 'rejected')),
        review_note VARCHAR(280),
        reviewed_by UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        reviewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS location_suggestions_status_idx
        ON geo.location_suggestions (status, created_at);`,
    // Set the first time an admin moves the pin: where the player put it.
    `ALTER TABLE geo.location_suggestions
        ADD COLUMN IF NOT EXISTS original_latitude DOUBLE PRECISION,
        ADD COLUMN IF NOT EXISTS original_longitude DOUBLE PRECISION;`,

    // Hand-made places: hubs and landmarks an admin put on the map, drawn
    // beside the ones the app finds in the tiles. Inactive ones are hidden
    // from players but kept. A suggestion makes at most one place.
    `CREATE TABLE IF NOT EXISTS geo.places (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kind VARCHAR(20) NOT NULL
            CHECK (kind IN ('mining', 'fishing', 'farming', 'foraging', 'landmark')),
        name VARCHAR(60) NOT NULL CHECK (length(name) > 0),
        description VARCHAR(280) NOT NULL DEFAULT '',
        latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
        longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        suggestion_id UUID UNIQUE REFERENCES geo.location_suggestions(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS places_active_position_idx
        ON geo.places (latitude, longitude) WHERE active;`,
    // Per-kind settings an admin sets, e.g. a fishing spot's tier.
    `ALTER TABLE geo.places ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';`,

    // A deleted player takes their listings with
    // them. Other players' coins held by bids on those listings go back to
    // them first, through the ledger, rather than vanishing.
    `CREATE OR REPLACE FUNCTION geo.refund_bids_on_seller_delete() RETURNS trigger AS $$
    BEGIN
        UPDATE geo.players p SET coins = p.coins + refund.total
        FROM (
            SELECT b.bidder_id, SUM(b.amount) AS total
            FROM geo.market_bids b JOIN geo.market_listings l ON l.id = b.listing_id
            WHERE b.status = 'held' AND l.seller_id = OLD.id AND b.bidder_id <> OLD.id
            GROUP BY b.bidder_id
        ) refund
        WHERE p.id = refund.bidder_id;

        INSERT INTO geo.coin_ledger (player_id, delta, reason, reference)
        SELECT b.bidder_id, b.amount, 'market-bid-return', 'listing:' || b.listing_id
        FROM geo.market_bids b JOIN geo.market_listings l ON l.id = b.listing_id
        WHERE b.status = 'held' AND l.seller_id = OLD.id AND b.bidder_id <> OLD.id;

        UPDATE geo.market_bids b SET status = 'returned'
        FROM geo.market_listings l
        WHERE l.id = b.listing_id AND b.status = 'held' AND l.seller_id = OLD.id;
        RETURN OLD;
    END;
    $$ LANGUAGE plpgsql;`,
    `DROP TRIGGER IF EXISTS refund_bids_on_seller_delete ON geo.players;`,
    `CREATE TRIGGER refund_bids_on_seller_delete BEFORE DELETE ON geo.players
        FOR EACH ROW EXECUTE FUNCTION geo.refund_bids_on_seller_delete();`,

    // Friends (modules/friends): one row per pair, whichever way it was asked.
    // Pending until the addressee accepts; declining or removing deletes it.
    `CREATE TABLE IF NOT EXISTS geo.friendships (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        addressee_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        accepted_at TIMESTAMPTZ,
        CHECK (requester_id <> addressee_id)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS friendships_pair_key
        ON geo.friendships (LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));`,
    `CREATE INDEX IF NOT EXISTS friendships_addressee_idx ON geo.friendships (addressee_id, status);`,
    // Presence, from the app's heartbeat. A null activity means the app said
    // it went away; otherwise online while last_seen_at is recent.
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;`,
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS activity VARCHAR(20);`,
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS activity_skill VARCHAR(40);`,

    // Feedback (modules/feedback): bugs, suggestions and the rest, for a game
    // admin to triage. A deleted player's feedback stays, unsigned. The app
    // version and platform are the app's, so a bug can be placed.
    `CREATE TABLE IF NOT EXISTS geo.feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('bug', 'suggestion', 'other')),
        title VARCHAR(80) NOT NULL CHECK (length(title) > 0),
        body VARCHAR(2000) NOT NULL DEFAULT '',
        app_version VARCHAR(40),
        platform VARCHAR(40),
        status VARCHAR(20) NOT NULL DEFAULT 'new'
            CHECK (status IN ('new', 'seen', 'planned', 'done', 'wontfix')),
        updated_by UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        updated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS feedback_status_idx ON geo.feedback (status, created_at);`,
    `CREATE INDEX IF NOT EXISTS feedback_player_idx ON geo.feedback (player_id, created_at);`,

    // The inbox (modules/inbox). Messages are one player's (an admin's reply
    // to their feedback); read when the player opens the inbox.
    `CREATE TABLE IF NOT EXISTS geo.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('feedbackReply')),
        title VARCHAR(80) NOT NULL,
        body VARCHAR(4000) NOT NULL,
        sent_by UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        feedback_id UUID REFERENCES geo.feedback(id) ON DELETE SET NULL,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS messages_player_idx ON geo.messages (player_id, created_at);`,
    `CREATE INDEX IF NOT EXISTS messages_feedback_idx ON geo.messages (feedback_id) WHERE feedback_id IS NOT NULL;`,
    // Announcements are everyone's: one row, never copied per player. A
    // player's inbox_read_at says which are read (null: none since joining).
    // posted_by is null for the server's own, e.g. a new mayor.
    `CREATE TABLE IF NOT EXISTS geo.announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        kind VARCHAR(20) NOT NULL CHECK (kind IN ('news', 'changelog', 'event', 'mayor')),
        title VARCHAR(80) NOT NULL CHECK (length(title) > 0),
        body VARCHAR(4000) NOT NULL DEFAULT '',
        version VARCHAR(40),
        posted_by UUID REFERENCES geo.players(id) ON DELETE SET NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CHECK (kind <> 'changelog' OR version IS NOT NULL)
    );`,
    `CREATE INDEX IF NOT EXISTS announcements_created_idx ON geo.announcements (created_at);`,
    // A message can also be a player's farm contest results.
    `ALTER TABLE geo.messages DROP CONSTRAINT IF EXISTS messages_kind_check;`,
    `ALTER TABLE geo.messages ADD CONSTRAINT messages_kind_check CHECK (kind IN ('feedbackReply', 'contest'));`,

    // Weekly farm contests (modules/farming). A harvest adds to the player's
    // score for its week; weeks run Monday to Monday UTC, counted by
    // farming/farm.ts weekOf. `mutation` keeps the best single harvest.
    `CREATE TABLE IF NOT EXISTS geo.farm_contest_scores (
        week INTEGER NOT NULL,
        contest VARCHAR(20) NOT NULL CHECK (contest IN ('harvest', 'mutation', 'crop')),
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        score BIGINT NOT NULL DEFAULT 0 CHECK (score >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (week, contest, player_id)
    );`,
    `CREATE INDEX IF NOT EXISTS farm_contest_scores_rank_idx ON geo.farm_contest_scores (week, contest, score DESC);`,
    // One row per week once its start is announced and its contests settled;
    // the job uses them so each happens once, even with several servers.
    `CREATE TABLE IF NOT EXISTS geo.farm_weeks (
        week INTEGER PRIMARY KEY,
        announced_at TIMESTAMPTZ,
        settled_at TIMESTAMPTZ
    );`,
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS inbox_read_at TIMESTAMPTZ;`,

    // Farming (modules/farming). One farm per player, made the first time
    // they look at it; its whole grid lives in `state` (farming/farm.ts), so
    // it moves to one row in a Durable Object later without reshaping.
    `CREATE TABLE IF NOT EXISTS geo.farms (
        player_id UUID PRIMARY KEY REFERENCES geo.players(id) ON DELETE CASCADE,
        state JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,
    // Seed Bag slots unlocked: data/config/farming.ts seedBagSlots to start,
    // up to 4 (GEO_SEED_BAG_MAX_SLOTS).
    `ALTER TABLE geo.players ADD COLUMN IF NOT EXISTS seed_bag_slots INTEGER NOT NULL DEFAULT 2
        CHECK (seed_bag_slots BETWEEN 1 AND 4);`,
    // Seeds packed for farming, kept like geo.bait: one stack of one seed per
    // slot, moved out of geo.inventory while packed.
    `CREATE TABLE IF NOT EXISTS geo.seed_bag (
        player_id UUID NOT NULL REFERENCES geo.players(id) ON DELETE CASCADE,
        slot SMALLINT NOT NULL CHECK (slot >= 0 AND slot < 4),
        item_id VARCHAR(80) NOT NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        PRIMARY KEY (player_id, slot)
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS seed_bag_one_slot_per_seed_idx ON geo.seed_bag (player_id, item_id);`,
];
