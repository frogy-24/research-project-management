import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifyAuthToken } from "@/lib/auth";
import type { AuthSession } from "@/types/auth.schema";
import prisma from "@/lib/prisma";

/**
 * Get the authenticated user from the session cookie (server-side only).
 * Returns the session payload + the user's departmentId from the DB.
 */
export interface AuthUser extends AuthSession {
  departmentId: string | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await verifyAuthToken(decodeURIComponent(token));
    if (!session) return null;

    // Fetch departmentId from DB for role-based filtering
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { departmentId: true },
    });

    return {
      ...session,
      departmentId: user?.departmentId ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Returns the departmentId filter for DEAN role, null otherwise.
 */
export function getDepartmentFilter(authUser: AuthUser): string | null {
  if (authUser.role === "DEAN" && authUser.departmentId) {
    return authUser.departmentId;
  }
  return null;
}

/**
 * Check if the authenticated user is an ADMIN.
 */
export function isAdmin(authUser: AuthUser): boolean {
  return authUser.role === "ADMIN";
}

/**
 * Check if user can manage (CRUD) a given departmentId.
 * ADMIN can manage all, DEAN can only manage their own department.
 */
export function canManageDepartment(authUser: AuthUser, departmentId: string | null): boolean {
  if (isAdmin(authUser)) return true;
  if (authUser.role === "DEAN" && departmentId && authUser.departmentId === departmentId) return true;
  return false;
}
