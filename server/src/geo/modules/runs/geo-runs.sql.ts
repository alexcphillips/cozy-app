const RUN_COLUMNS = `id, player_id, kind, status, enemy_ids, spawn_id, state, rewards, coins_lost, keeps_health, dungeon_id, dungeon_run_id, dungeon_room`;

export const FIND_ACTIVE_RUN = `
  SELECT ${RUN_COLUMNS} FROM geo.runs WHERE player_id = $1 AND status = 'active';
`;

/** The Run in progress, locked, for ending it from outside the fight. */
export const FIND_ACTIVE_RUN_FOR_UPDATE = `
  SELECT ${RUN_COLUMNS} FROM geo.runs WHERE player_id = $1 AND status = 'active' FOR UPDATE;
`;

/** Locks the Run, so two taps on a card can't both resolve. */
export const FIND_RUN_FOR_UPDATE = `
  SELECT ${RUN_COLUMNS} FROM geo.runs WHERE id = $1 AND player_id = $2 FOR UPDATE;
`;

/**
 * A Run untouched this long is treated as fled: the app was closed mid-fight.
 * Checked lazily, whenever the player next looks at or starts a Run.
 */
export const ABANDON_STALE_RUNS = `
  UPDATE geo.runs SET status = 'fled', ended_at = now()
  WHERE player_id = $1 AND status = 'active'
    AND updated_at < now() - make_interval(mins => $2);
`;

export const INSERT_RUN = `
  INSERT INTO geo.runs (player_id, kind, enemy_ids, spawn_id, state, keeps_health, dungeon_id, dungeon_run_id, dungeon_room)
  VALUES ($1, $2, $3::text[], $4, $5::jsonb, $6, $7, $8, $9)
  RETURNING ${RUN_COLUMNS};
`;

export const UPDATE_RUN = `
  UPDATE geo.runs
  SET state = $2::jsonb, status = $3::text, rewards = $4::jsonb, coins_lost = $5, updated_at = now(),
      ended_at = CASE WHEN $3::text = 'active' THEN NULL ELSE now() END
  WHERE id = $1;
`;
