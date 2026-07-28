import crypto from "crypto";
import { promisify } from "util";
import { AUTH } from "../config/constants";

const scryptAsync = promisify(crypto.scrypt);

/** Returns a `salt:hash` string suitable for the `users.password_hash` column. */

export async function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");

    const pwHash = (await scryptAsync(
        password,
        salt,
        AUTH.SCRYPT_KEY_LENGTH,
    )) as Buffer;

    return `${salt}:${pwHash.toString("hex")}`;
}

export async function comparePassword(password: string, storedHash: string) {
    const [salt, hash] = storedHash.split(":");

    if (!salt || !hash) {
        throw new Error("Invalid stored password format");
    }

    const pwHash = (await scryptAsync(
        password,
        salt,
        AUTH.SCRYPT_KEY_LENGTH,
    )) as Buffer;

    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), pwHash);
}
