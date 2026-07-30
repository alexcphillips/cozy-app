/**
 * Every statement the users module runs. Keeping them in one file (rather than
 * inline) means "what does this module do to the database?" is answered by
 * reading a single screen.
 */
export const FIND_ALL_USERS = `
  SELECT id, username, email, created_at, updated_at, is_admin
  FROM users
  ORDER BY created_at DESC
`;

export const FIND_USER_BY_EMAIL = `
  SELECT id, username, email, password_hash, created_at, updated_at, is_admin
  FROM users
  WHERE email = $1
`;

export const INSERT_USER = `
  INSERT INTO users (username, email, password_hash)
  VALUES ($1, $2, $3)
  RETURNING id, username, email, created_at, updated_at
`;

export function buildPatchUserQuery(setClauses: string[]): string {
    return `
    UPDATE users
    SET
      ${setClauses.join(", ")},
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, username, email, is_admin, created_at;
  `;
}

export const DELETE_USER_BY_ID = `
  DELETE FROM users
  WHERE id = $1
`;
