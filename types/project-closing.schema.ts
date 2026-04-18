import { z } from 'zod';
import { ProjectStatusEnum } from '@/types/project.schema';

export const uploadedEvidenceFileSchema = z.object({
    name: z.string().min(1),
    url: z.string().min(1),
});

export const projectClosingStatusEnum = z.enum(['SUBMITTED', 'REVISION_REQUESTED', 'APPROVED']);

export const projectClosingSubmissionSchema = z.object({
    id: z.string().cuid(),
    projectId: z.string().cuid(),
    submittedById: z.string().cuid(),
    status: projectClosingStatusEnum,
    note: z.string().nullable(),
    reportFiles: uploadedEvidenceFileSchema.array(),
    researchSourceCodeFiles: uploadedEvidenceFileSchema.array(),
    researchGuideFiles: uploadedEvidenceFileSchema.array(),
    administrativeDefenseApplicationFiles: uploadedEvidenceFileSchema.array(),
    administrativeAchievementEvidenceFiles: uploadedEvidenceFileSchema.array(),
    administrativeAdvisorReviewFiles: uploadedEvidenceFileSchema.array(),
    presentationSlideFiles: uploadedEvidenceFileSchema.array(),
    presentationVideoFiles: uploadedEvidenceFileSchema.array(),
    submittedAt: z.coerce.date(),
    createdAt: z.coerce.date(),
    updatedAt: z.coerce.date(),
});

export const submitProjectClosingSchema = z.object({
    projectId: z.string().cuid(),
    note: z.string().trim().optional().nullable(),
    reportFiles: uploadedEvidenceFileSchema.array().min(1, 'Vui lòng tải lên báo cáo đề tài'),
    researchSourceCodeFiles: uploadedEvidenceFileSchema.array().min(1, 'Vui lòng tải lên source code'),
    researchGuideFiles: uploadedEvidenceFileSchema.array().min(1, 'Vui lòng tải lên tài liệu hướng dẫn'),
    administrativeDefenseApplicationFiles: uploadedEvidenceFileSchema
        .array()
        .min(1, 'Vui lòng tải lên đơn xin bảo vệ/nghiệm thu đề tài NCKH'),
    administrativeAchievementEvidenceFiles: uploadedEvidenceFileSchema
        .array()
        .min(1, 'Vui lòng tải lên minh chứng thành tích'),
    administrativeAdvisorReviewFiles: uploadedEvidenceFileSchema
        .array()
        .min(1, 'Vui lòng tải lên bản nhận xét của giảng viên hướng dẫn'),
    presentationSlideFiles: uploadedEvidenceFileSchema.array().min(1, 'Vui lòng tải lên slide thuyết trình'),
    presentationVideoFiles: uploadedEvidenceFileSchema.array().optional().default([]),
});

export const lecturerProjectClosingItemSchema = z.object({
    project: z.object({
        id: z.string().cuid(),
        title: z.string(),
        status: ProjectStatusEnum,
        callRound: z
            .object({
                id: z.string().cuid(),
                name: z.string(),
            })
            .nullable(),
        student: z.object({
            id: z.string().cuid(),
            name: z.string(),
            code: z.string().nullable().optional(),
            email: z.string().email(),
        }),
    }),
    submission: projectClosingSubmissionSchema.nullable(),
});

export const lecturerProjectClosingListSchema = lecturerProjectClosingItemSchema.array();

export const deanProjectClosingItemSchema = z.object({
    project: z.object({
        id: z.string().cuid(),
        title: z.string(),
        status: ProjectStatusEnum,
        callRound: z
            .object({
                id: z.string().cuid(),
                name: z.string(),
            })
            .nullable(),
        student: z.object({
            id: z.string().cuid(),
            name: z.string(),
            code: z.string().nullable().optional(),
            email: z.string().email(),
        }),
        instructor: z
            .object({
                id: z.string().cuid(),
                name: z.string(),
                code: z.string().nullable().optional(),
                email: z.string().email(),
            })
            .nullable(),
    }),
    submission: projectClosingSubmissionSchema,
});

export const deanProjectClosingListSchema = deanProjectClosingItemSchema.array();

export const deanReviewProjectClosingStatusEnum = z.enum(['REVISION_REQUESTED', 'APPROVED']);

export const deanReviewProjectClosingSchema = z.object({
    submissionId: z.string().cuid(),
    status: deanReviewProjectClosingStatusEnum,
    note: z.string().trim().optional().nullable(),
});

export type UploadedEvidenceFile = z.infer<typeof uploadedEvidenceFileSchema>;
export type ProjectClosingStatus = z.infer<typeof projectClosingStatusEnum>;
export type ProjectClosingSubmission = z.infer<typeof projectClosingSubmissionSchema>;
export type SubmitProjectClosingInput = z.infer<typeof submitProjectClosingSchema>;
export type LecturerProjectClosingItem = z.infer<typeof lecturerProjectClosingItemSchema>;
export type DeanProjectClosingItem = z.infer<typeof deanProjectClosingItemSchema>;
export type DeanReviewProjectClosingInput = z.infer<typeof deanReviewProjectClosingSchema>;
export type DeanReviewProjectClosingStatus = z.infer<typeof deanReviewProjectClosingStatusEnum>;
