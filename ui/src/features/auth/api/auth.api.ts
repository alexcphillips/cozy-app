import {
    API_PATHS,
    type LoginRequest,
    type LoginResponse,
    type RegisterRequest,
    type PublicUser,
} from "@cozy/shared";
import { api } from "../../../lib/api";

/** Every auth endpoint this feature can reach. Nothing else calls them. */
export const authApi = {
    login(credentials: LoginRequest): Promise<LoginResponse> {
        return api.post<LoginResponse>(API_PATHS.auth.login, credentials);
    },

    register(input: RegisterRequest): Promise<PublicUser> {
        return api.post<PublicUser>(API_PATHS.auth.register, input);
    },
};
