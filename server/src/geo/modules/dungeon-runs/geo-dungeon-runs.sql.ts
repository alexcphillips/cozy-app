const COLUMNS = `id, player_id, dungeon_id, status, map, state`;

export const FIND_ACTIVE_DUNGEON_RUN = `
  SELECT ${COLUMNS} FROM geo.dungeon_runs WHERE player_id = $1 AND status = 'active';
`;

export const FIND_ACTIVE_DUNGEON_RUN_FOR_UPDATE = `
  SELECT ${COLUMNS} FROM geo.dungeon_runs WHERE player_id = $1 AND status = 'active' FOR UPDATE;
`;

export const FIND_DUNGEON_RUN_FOR_UPDATE = `
  SELECT ${COLUMNS} FROM geo.dungeon_runs WHERE id = $1 AND player_id = $2 FOR UPDATE;
`;

export const INSERT_DUNGEON_RUN = `
  INSERT INTO geo.dungeon_runs (player_id, dungeon_id, lobby_id, map, state)
  VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
  RETURNING ${COLUMNS};
`;

export const UPDATE_DUNGEON_RUN = `
  UPDATE geo.dungeon_runs
  SET status = $2::text, state = $3::jsonb, updated_at = now(),
      ended_at = CASE WHEN $2::text = 'active' THEN NULL ELSE now() END
  WHERE id = $1;
`;

/** A room fight's status and how much health it left, for a fight that ended outside the dungeon's own hooks. */
export const FIND_FIGHT = `
  SELECT status, state FROM geo.runs WHERE id = $1;
`;

/** Ends a room fight still going when the dungeon is left. */
export const END_FIGHT = `
  UPDATE geo.runs SET status = 'fled', updated_at = now(), ended_at = now() WHERE id = $1 AND status = 'active';
`;
