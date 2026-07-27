export type RegisterRequest = {
    username: string;
    email: string;
    password: string;
};

export type RegisterResponse = {
    id: number;
};

export type LoginRequest = {
    email: string;
    password: string;
};

export type LoginResponse = {
    token: string;
};

/** Claims carried by the bearer token. Mirrored in `server/src/types/express.d.ts`. */
export type AuthTokenPayload = {
    userId: number;
};
