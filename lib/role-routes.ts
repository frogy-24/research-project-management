import type { Role } from "@/types/user.schema";

export const roleRoutePrefix: Record<Role, string> = {
  ADMIN: "/admin",
  LECTURER: "/lecturer",
  STUDENT: "/student",
  DEAN: "/dean",
  COUNCIL: "/council",
  LEADER: "/leader",
  DISBURSER: "/disburser",
};

const roleDefaultRoute: Record<Role, string> = {
  ADMIN: "/admin",
  LECTURER: "/lecturer/profile",
  STUDENT: "/student/profile",
  DEAN: "/dean",
  COUNCIL: "/council",
  LEADER: "/leader",
  DISBURSER: "/disburser/disbursements",
};

export const getDashboardRoute = (role: Role) => roleDefaultRoute[role];

export const getExpectedRoleByPathname = (pathname: string): Role | null => {
  const match = Object.entries(roleRoutePrefix).find(([, prefix]) => pathname.startsWith(prefix));
  return (match?.[0] as Role | undefined) ?? null;
};
