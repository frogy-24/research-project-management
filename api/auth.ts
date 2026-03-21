import { api } from '@/lib/axios';
import { 
    authSessionSchema, 
    loginInputSchema, 
    loginWithCredentialsSchema,
    type AuthSession,
    type LoginWithCredentials 
} from '@/types/auth.schema';
import type { Role } from '@/types/user.schema';

type ApiSuccess<T> = {
    success: true;
    data: T;
};

export const authApi = {
    session: async (): Promise<AuthSession | null> => {
        const response = await api.get<ApiSuccess<AuthSession | null>>('/auth/session');

        if (!response.data.data) {
            return null;
        }

        return authSessionSchema.parse(response.data.data);
    },

    loginWithCredentials: async (credentials: LoginWithCredentials): Promise<{ role: Role; userId: string; name: string; email: string }> => {
        const payload = loginWithCredentialsSchema.parse(credentials);
        const response = await api.post<ApiSuccess<{ role: Role; userId: string; name: string; email: string }>>('/auth/login', payload);
        return response.data.data;
    },

    loginAsRole: async (role: Role): Promise<{ role: Role; userId: string }> => {
        const payload = loginInputSchema.parse({ role });
        const response = await api.post<ApiSuccess<{ role: Role; userId: string }>>('/auth/login', payload);
        return response.data.data;
    },

    logout: async (): Promise<void> => {
        await api.post<ApiSuccess<null>>('/auth/logout', null);
    },
};
