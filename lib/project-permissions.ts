import type { ProjectStatus } from "@/types/project.schema";
import { RoleEnum, type Role } from "@/types/user.schema";

type TransitionRule = Record<Role, Partial<Record<ProjectStatus, ProjectStatus[]>>>;

const transitionRules: TransitionRule = {
  STUDENT: {},
  LECTURER: {
    DRAFT: ["SUBMITTED"],
    DEAN_REVISION: ["SUBMITTED"],
    APPROVED: ["IN_PROGRESS"],
    IN_PROGRESS: ["COMPLETED"],
  },
  DEAN: {
    SUBMITTED: ["DEAN_APPROVED", "DEAN_REVISION"],
  },
  ADMIN: {
    DEAN_APPROVED: ["ADMIN_REVIEW"],
    COUNCIL_EVALUATING: ["APPROVED", "REJECTED"],
  },
  COUNCIL: {
    ADMIN_REVIEW: ["COUNCIL_EVALUATING"],
  },
  LEADER: {},
  DISBURSER: {},
};

export const getActorRole = (request: Request): Role | null => {
  const rawRole = request.headers.get("x-auth-role") ?? request.headers.get("x-user-role");

  if (!rawRole) {
    return null;
  }

  const parsed = RoleEnum.safeParse(rawRole);
  return parsed.success ? parsed.data : null;
};

export const getActorUserId = (request: Request) => request.headers.get("x-auth-user-id");

export const canCreateProject = (role: Role) => role === "LECTURER" || role === "ADMIN";

export const canDeleteProject = (role: Role) => role === "LECTURER" || role === "ADMIN";

export const canUpdateProjectMeta = (role: Role) => role === "ADMIN";

export const canTransitionStatus = (
  role: Role,
  currentStatus: ProjectStatus,
  nextStatus: ProjectStatus
) => {
  if (currentStatus === nextStatus) {
    return true;
  }

  const allowed = transitionRules[role][currentStatus] ?? [];
  return allowed.includes(nextStatus);
};

export const canCreateProgressReport = (role: Role) => role === "LECTURER" || role === "STUDENT";

export const canCreateExtensionRequest = (role: Role) => role === "LECTURER";

export const canReviewExtensionRequest = (role: Role) => role === "ADMIN";

export const canCreateCouncilEvaluation = (role: Role) => role === "COUNCIL" || role === "LECTURER";

export const canCreateDisbursement = (role: Role) => role === "ADMIN";

export const canPayDisbursement = (role: Role) => role === "DISBURSER";
