/**
 * A user as the API is willing to expose it. Never contains `password_hash` -
 * that column must not leave the repository layer.
 */
export type PublicUser = {
    id: number;
    username: string;
    email: string;
    createdAt: string;
};
