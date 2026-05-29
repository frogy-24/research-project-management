import { z } from "zod";

export const RegistrationStatusEnum = z.enum(["PENDING", "APPROVED", "CANCELED", "REJECTED"]);
export const InstructorStatusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED"]);
export const FacultyStatusEnum = z.enum(["PENDING", "APPROVED", "REJECTED"]);
export const TeamMemberInvitationStatusEnum = z.enum(["PENDING", "ACCEPTED", "REJECTED", "CANCELED"]);

export const registrationTeamMemberSchema = z.object({
  name: z.string().min(1, "Tên thành viên không được để trống"),
  role: z.string().min(1, "Vai trò thành viên không được để trống").optional().default("Thành viên"),
  studentId: z.string().cuid().optional(),
  invitationStatus: TeamMemberInvitationStatusEnum.optional(),
  invitedAt: z.coerce.date().optional(),
  respondedAt: z.coerce.date().nullable().optional(),
});

export const registrationProposalFileSchema = z.object({
  name: z.string().min(1, "Tên file không được để trống"),
  url: z.string().min(1, "Đường dẫn file không hợp lệ"),
  size: z.number().int().nonnegative().optional(),
  type: z.string().optional(),
});

export const projectRegistrationSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  callRoundId: z.string().cuid().nullable().optional(),
  title: z.string().min(1),
  objective: z.string().min(1),
  expectedOutput: z.string().nullable().optional(),
  proposalFiles: z.array(registrationProposalFileSchema).optional().nullable(),
  teamMembers: z.array(registrationTeamMemberSchema).max(5).nullable().optional(),
  instructorId: z.string().cuid().nullable().optional(),
  instructorStatus: InstructorStatusEnum.optional(),
  facultyStatus: FacultyStatusEnum.optional(),
  status: RegistrationStatusEnum,
  cancelReason: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  instructor: z.object({
    id: z.string().cuid(),
    name: z.string(),
  }).nullable().optional(),
  callRound: z
    .object({
      id: z.string().cuid(),
      name: z.string(),
      registrationStartDate: z.coerce.date().optional(),
      registrationEndDate: z.coerce.date().optional(),
      projectStartDate: z.coerce.date().nullable().optional(),
      projectEndDate: z.coerce.date().nullable().optional(),
    })
    .nullable()
    .optional(),
});

export const createProjectRegistrationSchema = projectRegistrationSchema
  .omit({
    id: true,
    userId: true,
    status: true,
    instructorStatus: true,
    cancelReason: true,
    createdAt: true,
    updatedAt: true,
    instructor: true,
    callRound: true,
  })
  .extend({
    callRoundId: z.string().optional(),
    instructorId: z.string().cuid("Vui lòng chọn giảng viên hướng dẫn"),
    teamMembers: z.array(registrationTeamMemberSchema).max(5).optional(),
  });

export const cancelProjectRegistrationSchema = z.object({
  cancelReason: z.string().min(1, "Cancel reason is required"),
});

export const updateProjectRegistrationSchema = z.object({
  title: z.string().min(1),
  objective: z.string().min(1),
  expectedOutput: z.string().nullable().optional(),
  proposalFiles: z.array(registrationProposalFileSchema).optional().nullable(),
  teamMembers: z.array(registrationTeamMemberSchema).max(5).optional(),
});

export type ProjectRegistration = z.infer<typeof projectRegistrationSchema>;
export type RegistrationProposalFile = z.infer<typeof registrationProposalFileSchema>;
export type CreateProjectRegistrationInput = z.infer<typeof createProjectRegistrationSchema>;
export type CancelProjectRegistrationInput = z.infer<typeof cancelProjectRegistrationSchema>;
export type UpdateProjectRegistrationInput = z.infer<typeof updateProjectRegistrationSchema>;
