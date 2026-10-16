/**
 * A lobby with its host's name, head count, and the database's clock, so the
 * phase and countdown never depend on the server's own clock drifting.
 */
const LOBBY_SELECT = `
  SELECT l.id, l.dungeon_id, l.host_id, host.display_name AS host_name, l.required_level, l.max_players,
         l.starts_at, l.started_at, l.closed_at, now() AS now,
         (SELECT count(*)::int FROM geo.dungeon_lobby_members m WHERE m.lobby_id = l.id) AS player_count
  FROM geo.dungeon_lobbies l
  JOIN geo.players host ON host.id = l.host_id
`;

/** Lobbies still counting down, soonest to start first. $1: at most this many. */
export const LIST_OPEN_LOBBIES = `
  ${LOBBY_SELECT}
  WHERE l.closed_at IS NULL AND l.started_at IS NULL AND l.starts_at > now()
  ORDER BY l.starts_at
  LIMIT $1;
`;

/**
 * The lobby the player is in, if any: not closed, not yet entered, and not
 * past its time to enter ($2 seconds after it started).
 */
export const FIND_PLAYER_LOBBY = `
  ${LOBBY_SELECT}
  JOIN geo.dungeon_lobby_members me ON me.lobby_id = l.id AND me.player_id = $1
  WHERE l.closed_at IS NULL AND me.entered_at IS NULL
    AND COALESCE(l.started_at, l.starts_at) + make_interval(secs => $2) > now()
  ORDER BY me.joined_at DESC
  LIMIT 1;
`;

/** Locks the lobby row, so a join can't overfill it and a start can't race a leave. */
export const LOCK_LOBBY = `SELECT id FROM geo.dungeon_lobbies WHERE id = $1 FOR UPDATE;`;

export const FIND_LOBBY = `
  ${LOBBY_SELECT}
  WHERE l.id = $1;
`;

export const FIND_MEMBERS = `
  SELECT m.player_id, p.display_name, m.entered_at IS NOT NULL AS has_entered
  FROM geo.dungeon_lobby_members m
  JOIN geo.players p ON p.id = m.player_id
  WHERE m.lobby_id = $1
  ORDER BY m.joined_at;
`;

export const INSERT_LOBBY = `
  INSERT INTO geo.dungeon_lobbies (dungeon_id, host_id, required_level, max_players, starts_at)
  VALUES ($1, $2, $3, $4, now() + make_interval(secs => $5))
  RETURNING id;
`;

export const INSERT_MEMBER = `
  INSERT INTO geo.dungeon_lobby_members (lobby_id, player_id) VALUES ($1, $2);
`;

export const DELETE_MEMBER = `
  DELETE FROM geo.dungeon_lobby_members WHERE lobby_id = $1 AND player_id = $2;
`;

export const CLOSE_LOBBY = `
  UPDATE geo.dungeon_lobbies SET closed_at = now() WHERE id = $1;
`;

export const START_LOBBY = `
  UPDATE geo.dungeon_lobbies SET started_at = now() WHERE id = $1;
`;

export const MARK_ENTERED = `
  UPDATE geo.dungeon_lobby_members SET entered_at = now() WHERE lobby_id = $1 AND player_id = $2;
`;
