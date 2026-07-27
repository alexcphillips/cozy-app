import type { PublicUser } from "@cozy/shared";
import { execute, query } from "../../db";
import {
    DELETE_USER_BY_ID,
    FIND_ALL_USERS,
    FIND_USER_BY_EMAIL,
    INSERT_USER,
} from "./users.sql";
import type { UserRow } from "./users.types";

/** Strips `password_hash` and renames columns to the wire contract. */
function toPublicUser(row: UserRow): PublicUser {
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        createdAt: row.created_at,
    };
}

export async function findAllUsers(): Promise<PublicUser[]> {
    const rows = await query<UserRow>(FIND_ALL_USERS);
    return rows.map(toPublicUser);
}

/**
 * Returns the raw row, `password_hash` included - login needs it. Callers must
 * not hand this to `res`; use {@link findPublicUserByEmail} for that.
 */
export async function findUserByEmail(email: string): Promise<UserRow | null> {
    const rows = await query<UserRow>(FIND_USER_BY_EMAIL, [email]);
    return rows[0] ?? null;
}

export async function findPublicUserByEmail(
    email: string,
): Promise<PublicUser | null> {
    const row = await findUserByEmail(email);
    return row ? toPublicUser(row) : null;
}

export async function insertUser(input: {
    username: string;
    email: string;
    passwordHash: string;
}): Promise<PublicUser> {
    const rows = await query<UserRow>(INSERT_USER, [
        input.username,
        input.email,
        input.passwordHash,
    ]);

    const row = rows[0];

    if (!row) {
        throw new Error("INSERT_USER returned no row");
    }

    return toPublicUser(row);
}

/** @returns whether a row was actually removed. */
export async function deleteUserById(id: number): Promise<boolean> {
    const rowCount = await execute(DELETE_USER_BY_ID, [id]);
    return rowCount > 0;
}
