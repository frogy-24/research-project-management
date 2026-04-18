import { NextResponse } from 'next/server';
import { Prisma } from '@/prisma/generated/prisma';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import {
    submitProjectClosingSchema,
    uploadedEvidenceFileSchema,
    type UploadedEvidenceFile,
} from '@/types/project-closing.schema';
import { ZodError } from 'zod';

const uploadedEvidenceFileArraySchema = uploadedEvidenceFileSchema.array();

const mapZodError = (zodError: ZodError) => {
    const fields: Record<string, string[]> = {};

    for (const issue of zodError.issues) {
        const key = issue.path.join('.') || 'form';
        fields[key] = [...(fields[key] ?? []), issue.message];
    }

    return fields;
};

const parseUploadedEvidenceFiles = (value: Prisma.JsonValue | null | undefined): UploadedEvidenceFile[] => {
    const parsed = uploadedEvidenceFileArraySchema.safeParse(value);
    return parsed.success ? parsed.data : [];
};

const toSubmissionResponse = (
    submission: {
        id: string;
        projectId: string;
        submittedById: string;
        status: 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED';
        note: string | null;
        reportFiles: Prisma.JsonValue | null;
        researchSourceCodeFiles: Prisma.JsonValue | null;
        researchGuideFiles: Prisma.JsonValue | null;
        administrativeDefenseApplicationFiles: Prisma.JsonValue | null;
        administrativeAchievementEvidenceFiles: Prisma.JsonValue | null;
        administrativeAdvisorReviewFiles: Prisma.JsonValue | null;
        presentationSlideFiles: Prisma.JsonValue | null;
        presentationVideoFiles: Prisma.JsonValue | null;
        submittedAt: Date;
        createdAt: Date;
        updatedAt: Date;
    } | null,
) => {
    if (!submission) {
        return null;
    }

    return {
        id: submission.id,
        projectId: submission.projectId,
        submittedById: submission.submittedById,
        status: submission.status,
        note: submission.note,
        reportFiles: parseUploadedEvidenceFiles(submission.reportFiles),
        researchSourceCodeFiles: parseUploadedEvidenceFiles(submission.researchSourceCodeFiles),
        researchGuideFiles: parseUploadedEvidenceFiles(submission.researchGuideFiles),
        administrativeDefenseApplicationFiles: parseUploadedEvidenceFiles(submission.administrativeDefenseApplicationFiles),
        administrativeAchievementEvidenceFiles: parseUploadedEvidenceFiles(submission.administrativeAchievementEvidenceFiles),
        administrativeAdvisorReviewFiles: parseUploadedEvidenceFiles(submission.administrativeAdvisorReviewFiles),
        presentationSlideFiles: parseUploadedEvidenceFiles(submission.presentationSlideFiles),
        presentationVideoFiles: parseUploadedEvidenceFiles(submission.presentationVideoFiles),
        submittedAt: submission.submittedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
    };
};

export async function GET() {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'LECTURER') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const projects = await prisma.project.findMany({
            where: {
                instructorId: user.userId,
            },
            select: {
                id: true,
                title: true,
                status: true,
                callRound: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                leader: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        email: true,
                    },
                },
                closingSubmission: {
                    select: {
                        id: true,
                        projectId: true,
                        submittedById: true,
                        status: true,
                        note: true,
                        reportFiles: true,
                        researchSourceCodeFiles: true,
                        researchGuideFiles: true,
                        administrativeDefenseApplicationFiles: true,
                        administrativeAchievementEvidenceFiles: true,
                        administrativeAdvisorReviewFiles: true,
                        presentationSlideFiles: true,
                        presentationVideoFiles: true,
                        submittedAt: true,
                        createdAt: true,
                        updatedAt: true,
                    },
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        const data = projects.map((project) => ({
            project: {
                id: project.id,
                title: project.title,
                status: project.status,
                callRound: project.callRound,
                student: {
                    id: project.leader.id,
                    name: project.leader.name,
                    code: project.leader.code,
                    email: project.leader.email,
                },
            },
            submission: toSubmissionResponse(project.closingSubmission),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching lecturer project closings:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch project closings' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getAuthUser();
        if (!user || user.role !== 'LECTURER') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body: unknown = await request.json();
        const parsed = submitProjectClosingSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Invalid payload',
                    fields: mapZodError(parsed.error),
                },
                { status: 400 },
            );
        }

        const project = await prisma.project.findFirst({
            where: {
                id: parsed.data.projectId,
                instructorId: user.userId,
            },
            select: {
                id: true,
                status: true,
            },
        });

        if (!project) {
            return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
        }

        const submission = await prisma.projectClosingSubmission.upsert({
            where: {
                projectId: parsed.data.projectId,
            },
            create: {
                projectId: parsed.data.projectId,
                submittedById: user.userId,
                status: 'SUBMITTED',
                note: parsed.data.note ?? null,
                reportFiles: parsed.data.reportFiles,
                researchSourceCodeFiles: parsed.data.researchSourceCodeFiles,
                researchGuideFiles: parsed.data.researchGuideFiles,
                administrativeDefenseApplicationFiles: parsed.data.administrativeDefenseApplicationFiles,
                administrativeAchievementEvidenceFiles: parsed.data.administrativeAchievementEvidenceFiles,
                administrativeAdvisorReviewFiles: parsed.data.administrativeAdvisorReviewFiles,
                presentationSlideFiles: parsed.data.presentationSlideFiles,
                presentationVideoFiles: parsed.data.presentationVideoFiles,
                submittedAt: new Date(),
            },
            update: {
                submittedById: user.userId,
                status: 'SUBMITTED',
                note: parsed.data.note ?? null,
                reportFiles: parsed.data.reportFiles,
                researchSourceCodeFiles: parsed.data.researchSourceCodeFiles,
                researchGuideFiles: parsed.data.researchGuideFiles,
                administrativeDefenseApplicationFiles: parsed.data.administrativeDefenseApplicationFiles,
                administrativeAchievementEvidenceFiles: parsed.data.administrativeAchievementEvidenceFiles,
                administrativeAdvisorReviewFiles: parsed.data.administrativeAdvisorReviewFiles,
                presentationSlideFiles: parsed.data.presentationSlideFiles,
                presentationVideoFiles: parsed.data.presentationVideoFiles,
                submittedAt: new Date(),
            },
            select: {
                id: true,
                projectId: true,
                submittedById: true,
                status: true,
                note: true,
                reportFiles: true,
                researchSourceCodeFiles: true,
                researchGuideFiles: true,
                administrativeDefenseApplicationFiles: true,
                administrativeAchievementEvidenceFiles: true,
                administrativeAdvisorReviewFiles: true,
                presentationSlideFiles: true,
                presentationVideoFiles: true,
                submittedAt: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return NextResponse.json({ success: true, data: toSubmissionResponse(submission) }, { status: 201 });
    } catch (error) {
        console.error('Error submitting lecturer project closing:', error);
        return NextResponse.json({ success: false, error: 'Failed to submit project closing' }, { status: 500 });
    }
}
