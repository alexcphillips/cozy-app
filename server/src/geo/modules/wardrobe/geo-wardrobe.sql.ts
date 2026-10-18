export const FIND_WARDROBE_STATE = `
  SELECT wardrobe_bought, wardrobe_auto_swap, active_loadout FROM geo.players WHERE id = $1;
`;

export const FIND_LOADOUTS = `
  SELECT slot, name, equipment, pet_id, auto_for FROM geo.loadouts WHERE player_id = $1 ORDER BY slot;
`;

export const FIND_LOADOUT = `
  SELECT slot, name, equipment, pet_id, auto_for FROM geo.loadouts WHERE player_id = $1 AND slot = $2;
`;

/** Of these inventory ids, the ones the player still owns, with what they are. */
export const FIND_OWNED = `
  SELECT id, item_id FROM geo.inventory WHERE player_id = $1 AND id = ANY($2::uuid[]);
`;

/** What's worn now, gear and pet, as a loadout stores it. */
const WORN_EQUIPMENT = `(SELECT COALESCE(jsonb_object_agg(slot, inventory_id), '{}'::jsonb) FROM geo.equipment WHERE player_id = $1)`;
const WORN_PET = `(SELECT inventory_id FROM geo.active_pets WHERE player_id = $1)`;

/** Saves what's worn into the slot (keeping its auto tag) and makes it active. */
export const SAVE_WORN = `
  WITH saved AS (
    INSERT INTO geo.loadouts (player_id, slot, name, equipment, pet_id)
    VALUES ($1, $2, $3, ${WORN_EQUIPMENT}, ${WORN_PET})
    ON CONFLICT (player_id, slot) DO UPDATE
      SET name = EXCLUDED.name, equipment = EXCLUDED.equipment, pet_id = EXCLUDED.pet_id
  )
  UPDATE geo.players SET active_loadout = $2 WHERE id = $1;
`;

/** Brings the active loadout up to date with what's worn; nothing when none is active. */
export const SYNC_ACTIVE = `
  UPDATE geo.loadouts l SET equipment = ${WORN_EQUIPMENT}, pet_id = ${WORN_PET}
  FROM geo.players p
  WHERE p.id = $1 AND l.player_id = p.id AND l.slot = p.active_loadout;
`;

export const INSERT_LOADOUT = `
  INSERT INTO geo.loadouts (player_id, slot, name, equipment, pet_id) VALUES ($1, $2, $3, $4::jsonb, $5);
`;

export const RENAME_LOADOUT = `
  UPDATE geo.loadouts SET name = $3 WHERE player_id = $1 AND slot = $2 RETURNING slot;
`;

/** Clears the slot, and the active mark if it pointed there. */
export const DELETE_LOADOUT = `
  WITH gone AS (DELETE FROM geo.loadouts WHERE player_id = $1 AND slot = $2)
  UPDATE geo.players SET active_loadout = NULL WHERE id = $1 AND active_loadout = $2;
`;

export const SET_ACTIVE = `
  UPDATE geo.players SET active_loadout = $2 WHERE id = $1;
`;

export const CLEAR_EQUIPMENT = `
  DELETE FROM geo.equipment WHERE player_id = $1;
`;

/** Takes the tag off whichever loadout had it, then puts it on this one. */
export const CLEAR_AUTO_FOR = `
  UPDATE geo.loadouts SET auto_for = NULL WHERE player_id = $1 AND auto_for = $2;
`;

export const SET_AUTO_FOR = `
  UPDATE geo.loadouts SET auto_for = $3 WHERE player_id = $1 AND slot = $2 RETURNING slot;
`;

/** For auto-swap: whether it's owned, what's worn, and the loadout tagged for the activity. */
export const FIND_AUTO_TARGET = `
  SELECT p.wardrobe_auto_swap, p.active_loadout, l.slot AS target
  FROM geo.players p LEFT JOIN geo.loadouts l ON l.player_id = p.id AND l.auto_for = $2
  WHERE p.id = $1;
`;

export const ADD_BOUGHT_SLOT = `
  UPDATE geo.players SET wardrobe_bought = wardrobe_bought + 1 WHERE id = $1;
`;

export const SET_AUTO_SWAP_OWNED = `
  UPDATE geo.players SET wardrobe_auto_swap = true WHERE id = $1;
`;
