import { z } from 'zod';
import { TeamMemberInvitationStatusEnum } from '@/types/project-registration.schema';

const registrationStatusSchema = z.enum(['PENDING', 'APPROVED', 'CANCELED', 'REJECTED']);
const instructorStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'REJECTED']);
const facultyStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const invitationTeamMemberSchema = z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    studentId: z.string().cuid().optional(),
    invitationStatus: TeamMemberInvitationStatusEnum,
    invitedAt: z.coerce.date().optional(),
    respondedAt: z.coerce.date().nullable().optional(),
});

export const teamInvitationSchema = z.object({
    registrationId: z.string().cuid(),
    registrationTitle: z.string().min(1),
    registrationObjective: z.string().nullable().optional(),
    registrationExpectedOutput: z.string().nullable().optional(),
    registrationStatus: registrationStatusSchema.optional(),
    instructorStatus: instructorStatusSchema.optional(),
    facultyStatus: facultyStatusSchema.optional(),
    inviterId: z.string().cuid(),
    inviterName: z.string().min(1),
    inviterEmail: z.string().email().nullable().optional(),
    inviterCode: z.string().nullable().optional(),
    role: z.string().min(1),
    invitationStatus: TeamMemberInvitationStatusEnum,
    instructorId: z.string().cuid().nullable().optional(),
    instructorName: z.string().nullable().optional(),
    instructorEmail: z.string().email().nullable().optional(),
    invitedAt: z.coerce.date(),
    respondedAt: z.coerce.date().nullable().optional(),
    callRoundId: z.string().cuid().nullable().optional(),
    callRoundName: z.string().nullable().optional(),
    teamMembers: z.array(invitationTeamMemberSchema).optional(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export const teamInvitationListSchema = teamInvitationSchema.array();

export const respondTeamInvitationSchema = z.object({
    decision: TeamMemberInvitationStatusEnum.refine((value) => value !== 'PENDING', {
        message: 'Quyết định phải là ACCEPTED hoặc REJECTED',
    }),
});

export type TeamInvitation = z.infer<typeof teamInvitationSchema>;
export type RespondTeamInvitationInput = z.infer<typeof respondTeamInvitationSchema>;
