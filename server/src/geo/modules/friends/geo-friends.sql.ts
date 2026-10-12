/** Banned players can't be found, so they can't be asked either. */
export const FIND_PLAYER_BY_NAME = `
  SELECT id, display_name AS name FROM geo.players
  WHERE lower(display_name) = lower($1) AND banned_at IS NULL;
`;

/** The pair's row, whichever way it was asked. */
export const FIND_PAIR_FOR_UPDATE = `
  SELECT id, requester_id, addressee_id, status FROM geo.friendships
  WHERE (requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1)
  FOR UPDATE;
`;

/** Friends and requests either way: what GEO_FRIENDS_MAX caps. */
export const COUNT_RELATIONS = `
  SELECT COUNT(*) AS count FROM geo.friendships WHERE requester_id = $1 OR addressee_id = $1;
`;

/** Nothing if a concurrent request made the pair first. */
export const INSERT_REQUEST = `
  INSERT INTO geo.friendships (requester_id, addressee_id) VALUES ($1, $2)
  ON CONFLICT DO NOTHING
  RETURNING id;
`;

/** Only the addressee accepts, and only once. */
export const ACCEPT_REQUEST = `
  UPDATE geo.friendships SET status = 'accepted', accepted_at = now()
  WHERE id = $1 AND addressee_id = $2 AND status = 'pending'
  RETURNING id;
`;

/** Declined by the addressee, or cancelled by the requester. */
export const DELETE_REQUEST = `
  DELETE FROM geo.friendships
  WHERE id = $1 AND status = 'pending' AND (requester_id = $2 OR addressee_id = $2)
  RETURNING id;
`;

export const DELETE_FRIEND = `
  DELETE FROM geo.friendships
  WHERE status = 'accepted'
    AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))
  RETURNING id;
`;

/**
 * Every friend with their presence: online while the app hasn't said it
 * left and the last beat is younger than `$2` seconds. `fighting` is true
 * while they have a Run in progress, which outranks what their app reported.
 */
export const FIND_FRIENDS = `
  SELECT p.id, p.display_name AS name, f.accepted_at,
         p.last_seen_at, p.activity, p.activity_skill,
         (p.activity IS NOT NULL AND p.last_seen_at > now() - make_interval(secs => $2)) AS online,
         EXISTS (SELECT 1 FROM geo.runs r WHERE r.player_id = p.id AND r.status = 'active') AS fighting
  FROM geo.friendships f
  JOIN geo.players p ON p.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'accepted' AND (f.requester_id = $1 OR f.addressee_id = $1);
`;

/** Pending requests either way, newest first, with the other player's name. */
export const FIND_REQUESTS = `
  SELECT f.id, f.requester_id = $1 AS outgoing, p.id AS player_id, p.display_name AS name, f.created_at
  FROM geo.friendships f
  JOIN geo.players p ON p.id = CASE WHEN f.requester_id = $1 THEN f.addressee_id ELSE f.requester_id END
  WHERE f.status = 'pending' AND (f.requester_id = $1 OR f.addressee_id = $1)
  ORDER BY f.created_at DESC;
`;

/** The heartbeat: here now, doing this. Answers with the badge count. */
export const BEAT = `
  UPDATE geo.players SET last_seen_at = now(), activity = $2, activity_skill = $3 WHERE id = $1;
`;

export const COUNT_INCOMING = `
  SELECT COUNT(*) AS count FROM geo.friendships WHERE addressee_id = $1 AND status = 'pending';
`;

/** The app went to the background: offline now, not when the window runs out. */
export const LEAVE = `
  UPDATE geo.players SET last_seen_at = now(), activity = NULL, activity_skill = NULL WHERE id = $1;
`;
