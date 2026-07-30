/**
 * The `users` table exactly as Postgres returns it: snake_case, including the
 * credential column. Row types never leave the repository - controllers deal in
 * `@cozy/shared` contract types.
 */
export type UserRow = {
    id: number;
    username: string;
    email: string;
    password_hash: string;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
};
