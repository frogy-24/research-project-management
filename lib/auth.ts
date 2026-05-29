import { jwtVerify, SignJWT } from 'jose';
import { authSessionSchema, type AuthSession } from '@/types/auth.schema';
import type { Role } from '@/types/user.schema';

export const AUTH_COOKIE_NAME = 'urms_session';

const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error('Missing JWT_SECRET environment variable');
    }

    return new TextEncoder().encode(secret);
};

export const signAuthToken = async (payload: { userId: string; role: Role }) => {
    const token = await new SignJWT({ userId: payload.userId, role: payload.role })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getJwtSecret());

    return token;
};

export const verifyAuthToken = async (token: string): Promise<AuthSession | null> => {
    try {
        const verified = await jwtVerify(token, getJwtSecret());

        const parsed = authSessionSchema.safeParse({
            userId: verified.payload.userId,
            role: verified.payload.role,
            exp: verified.payload.exp,
        });

        return parsed.success ? parsed.data : null;
    } catch {
        return null;
    }
};

export const isSameOrigin = (request: Request) => {
    const origin = request.headers.get('origin');

    if (!origin) {
        return true;
    }

    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);

    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto');

    const effectiveHost = forwardedHost ?? requestUrl.host;
    const effectiveProto = forwardedProto ?? requestUrl.protocol.replace(':', '');

    if (originUrl.host !== effectiveHost) {
        return false;
    }

    const originProto = originUrl.protocol.replace(':', '');

    if (originProto === effectiveProto) {
        return true;
    }

    const isHttpHttpsPair =
        (originProto === 'http' && effectiveProto === 'https') ||
        (originProto === 'https' && effectiveProto === 'http');

    return isHttpHttpsPair;
};
