/**
 * Upsert by Google volume id: the same book saved by two users is one `book`
 * row. Metadata is refreshed on conflict so a later search result with a better
 * page count or cover wins.
 */
export const UPSERT_BOOK = `
  INSERT INTO book (google_volume_id, title, authors, thumbnail_url, page_count)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (google_volume_id) DO UPDATE SET
    title = EXCLUDED.title,
    authors = EXCLUDED.authors,
    thumbnail_url = COALESCE(EXCLUDED.thumbnail_url, book.thumbnail_url),
    page_count = COALESCE(EXCLUDED.page_count, book.page_count),
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, google_volume_id, title, authors, thumbnail_url, page_count
`;

export const INSERT_READING_INSTANCE = `
  INSERT INTO reading_instance (user_id, book_id, status, progress_unit, started_on)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id
`;

/**
 * Only unfinished instances block a re-add, so finishing a book and starting it
 * again creates a fresh instance (a re-read) rather than being rejected.
 */
export const FIND_ACTIVE_INSTANCE_FOR_BOOK = `
  SELECT id
  FROM reading_instance
  WHERE user_id = $1
    AND book_id = $2
    AND status IN ('tbr', 'reading')
  LIMIT 1
`;

/**
 * The shelf. Two LATERAL joins per instance: the newest log row, and the pace
 * across the whole logged span.
 *
 * Pace divides by elapsed *calendar* days rather than by number of log entries,
 * so days you didn't read drag the average down - which is what makes a
 * finish-date estimate match reality instead of flattering it.
 */
export const FIND_LIBRARY_BY_USER = `
  SELECT
    ri.id,
    b.id                  AS book_id,
    b.google_volume_id,
    b.title,
    b.authors,
    b.thumbnail_url,
    b.page_count,
    ri.status,
    ri.progress_unit,
    -- Cast DATE to text in SQL rather than letting pg hand back a JS Date:
    -- a Date built at local midnight shifts a day when serialised to UTC.
    ri.started_on::text   AS started_on,
    ri.finished_on::text  AS finished_on,
    latest.progress_value AS latest_progress,
    latest.log_user_date  AS latest_log_date,
    pace.pace_per_day
  FROM reading_instance ri
  JOIN book b ON b.id = ri.book_id
  LEFT JOIN LATERAL (
    SELECT rl.progress_value, rl.log_user_date::text AS log_user_date
    FROM reading_log rl
    WHERE rl.reading_instance_id = ri.id
    ORDER BY rl.log_user_date DESC
    LIMIT 1
  ) latest ON TRUE
  LEFT JOIN LATERAL (
    SELECT
      CASE
        WHEN MAX(rl.log_user_date) > MIN(rl.log_user_date)
        THEN (MAX(rl.progress_value) - MIN(rl.progress_value))
             / (MAX(rl.log_user_date) - MIN(rl.log_user_date))
        ELSE NULL
      END AS pace_per_day
    FROM reading_log rl
    WHERE rl.reading_instance_id = ri.id
  ) pace ON TRUE
  WHERE ri.user_id = $1
  ORDER BY ri.updated_at DESC
`;

/** Scoped by `user_id` as well as `id` so one user cannot touch another's row. */
export const UPDATE_READING_INSTANCE_STATUS = `
  UPDATE reading_instance
  SET status = $3,
      started_on = CASE
        WHEN $3 IN ('reading', 'finished') THEN COALESCE(started_on, $4::date)
        ELSE started_on
      END,
      finished_on = CASE
        WHEN $3 = 'finished' THEN COALESCE($4::date, CURRENT_DATE)
        ELSE NULL
      END,
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $1 AND user_id = $2
  RETURNING id
`;

/** Re-logging a day overwrites it - see `unique_instance_per_day` in schema.ts. */
export const UPSERT_READING_LOG = `
  INSERT INTO reading_log (reading_instance_id, user_id, progress_value, log_user_date)
  VALUES ($1, $2, $3, $4)
  ON CONFLICT (reading_instance_id, log_user_date) DO UPDATE SET
    progress_value = EXCLUDED.progress_value,
    updated_at = CURRENT_TIMESTAMP
  RETURNING id, reading_instance_id, progress_value, log_user_date::text AS log_user_date
`;

/**
 * Logging progress implies you are reading it, so a `tbr` instance promotes
 * itself. `updated_at` also drives the shelf's sort order.
 */
export const TOUCH_INSTANCE_AFTER_LOG = `
  UPDATE reading_instance
  SET status = CASE WHEN status = 'tbr' THEN 'reading' ELSE status END,
      started_on = COALESCE(started_on, $3::date),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = $1 AND user_id = $2
  RETURNING id
`;

export const FIND_INSTANCE_BY_ID_AND_USER = `
  SELECT id FROM reading_instance WHERE id = $1 AND user_id = $2
`;
