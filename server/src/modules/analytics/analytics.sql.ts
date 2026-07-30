export const GET_ANALYTICS_EVENTS = `
  SELECT
    id,
    user_id,
    event_name,
    properties,
    created_at
  FROM analytics_event
  WHERE
    created_at >= $1::date
    AND created_at < ($2::date + INTERVAL '1 day')
    AND ($3::integer IS NULL OR user_id = $3)
    -- FIXED: Added parameter slot $4 to optionally filter by event name strings
    AND ($4::varchar IS NULL OR event_name = $4)
  ORDER BY created_at DESC
  LIMIT 200;
`;

export const INSERT_ANALYTICS_EVENT = `
  INSERT INTO analytics_event (
    user_id,
    event_name,
    properties
  ) 
  VALUES ($1, $2, $3::jsonb) -- Explicitly cast to jsonb (or ::json based on schema)
  RETURNING id, user_id, event_name, properties, created_at;
`;
