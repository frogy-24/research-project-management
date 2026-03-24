import { z } from 'zod';

const officeMeetingMemberSchema = z.object({
    id: z.string().cuid(),
    name: z.string().min(1),
    email: z.string().email().optional(),
    code: z.string().nullable().optional(),
    roleLabel: z.string().optional(),
    isLeader: z.boolean().default(false),
    invitationStatus: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']).optional(),
});

export const createOfficeMeetingSchema = z.object({
    projectId: z.string().min(1),
    meetingTarget: z.enum(['STUDENT', 'GROUP']).default('STUDENT'),
    meetingAt: z.string().min(1),
    location: z.string().min(1, 'Địa điểm họp là bắt buộc'),
    note: z.string().optional(),
    memberUserIds: z.array(z.string().cuid()).max(10).optional(),
});

export const officeMeetingResponseSchema = z.object({
    success: z.boolean(),
    notificationId: z.string(),
    notificationCount: z.number().int().min(1).optional(),
});

export const officeMeetingMembersResponseSchema = z.object({
    success: z.boolean(),
    data: z.array(officeMeetingMemberSchema),
});

export type CreateOfficeMeetingInput = z.infer<typeof createOfficeMeetingSchema>;
export type OfficeMeetingResponse = z.infer<typeof officeMeetingResponseSchema>;
export type OfficeMeetingMember = z.infer<typeof officeMeetingMemberSchema>;
export type OfficeMeetingMembersResponse = z.infer<typeof officeMeetingMembersResponseSchema>;
