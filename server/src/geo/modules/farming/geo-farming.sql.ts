export const FIND_FARM_FOR_UPDATE = `
  SELECT state FROM geo.farms WHERE player_id = $1 FOR UPDATE;
`;

export const INSERT_FARM = `
  INSERT INTO geo.farms (player_id, state) VALUES ($1, $2)
  ON CONFLICT (player_id) DO NOTHING
  RETURNING state;
`;

export const UPDATE_FARM = `
  UPDATE geo.farms SET state = $2, updated_at = now() WHERE player_id = $1;
`;
