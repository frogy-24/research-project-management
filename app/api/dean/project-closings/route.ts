import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@/prisma/generated/prisma';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import {
    deanReviewProjectClosingSchema,
    projectClosingStatusEnum,
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

const toSubmissionResponse = (submission: {
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
}) => {
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
        administrativeAchievementEvidenceFiles: parseUploadedEvidenceFiles(
            submission.administrativeAchievementEvidenceFiles,
        ),
        administrativeAdvisorReviewFiles: parseUploadedEvidenceFiles(submission.administrativeAdvisorReviewFiles),
        presentationSlideFiles: parseUploadedEvidenceFiles(submission.presentationSlideFiles),
        presentationVideoFiles: parseUploadedEvidenceFiles(submission.presentationVideoFiles),
        submittedAt: submission.submittedAt,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
    };
};

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const statusParam = request.nextUrl.searchParams.get('status')?.trim() || '';
        const callRoundId = request.nextUrl.searchParams.get('callRoundId')?.trim() || '';
        const search = request.nextUrl.searchParams.get('search')?.trim() || '';

        const parsedStatus = statusParam ? projectClosingStatusEnum.safeParse(statusParam) : null;
        if (statusParam && (!parsedStatus || !parsedStatus.success)) {
            return NextResponse.json({ success: false, error: 'Invalid status filter' }, { status: 400 });
        }

        const submissions = await prisma.projectClosingSubmission.findMany({
            where: {
                ...(parsedStatus?.success ? { status: parsedStatus.data } : {}),
                project: {
                    ...(session.departmentId
                        ? {
                              leader: {
                                  departmentId: session.departmentId,
                              },
                          }
                        : {}),
                    ...(callRoundId ? { callRoundId } : {}),
                    ...(search
                        ? {
                              OR: [
                                  {
                                      title: {
                                          contains: search,
                                          mode: 'insensitive',
                                      },
                                  },
                                  {
                                      leader: {
                                          name: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                  },
                                  {
                                      leader: {
                                          code: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                  },
                                  {
                                      instructor: {
                                          name: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                  },
                                  {
                                      callRound: {
                                          name: {
                                              contains: search,
                                              mode: 'insensitive',
                                          },
                                      },
                                  },
                              ],
                          }
                        : {}),
                },
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
                project: {
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
                        instructor: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                submittedAt: 'desc',
            },
        });

        const data = submissions.map((submission) => ({
            project: {
                id: submission.project.id,
                title: submission.project.title,
                status: submission.project.status,
                callRound: submission.project.callRound,
                student: {
                    id: submission.project.leader.id,
                    name: submission.project.leader.name,
                    code: submission.project.leader.code,
                    email: submission.project.leader.email,
                },
                instructor: submission.project.instructor
                    ? {
                          id: submission.project.instructor.id,
                          name: submission.project.instructor.name,
                          code: submission.project.instructor.code,
                          email: submission.project.instructor.email,
                      }
                    : null,
            },
            submission: toSubmissionResponse(submission),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching dean project closings:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch project closings' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body: unknown = await request.json();
        const parsed = deanReviewProjectClosingSchema.safeParse(body);
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

        const existing = await prisma.projectClosingSubmission.findFirst({
            where: {
                id: parsed.data.submissionId,
                ...(session.departmentId
                    ? {
                          project: {
                              leader: {
                                  departmentId: session.departmentId,
                              },
                          },
                      }
                    : {}),
            },
            select: {
                id: true,
                note: true,
            },
        });

        if (!existing) {
            return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 });
        }

        const normalizedNote =
            typeof parsed.data.note === 'string' && parsed.data.note.trim().length > 0 ? parsed.data.note.trim() : null;

        const updatedSubmission = await prisma.projectClosingSubmission.update({
            where: {
                id: existing.id,
            },
            data: {
                status: parsed.data.status,
                note: normalizedNote ?? existing.note,
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

        return NextResponse.json({ success: true, data: toSubmissionResponse(updatedSubmission) });
    } catch (error) {
        console.error('Error reviewing dean project closing:', error);
        return NextResponse.json({ success: false, error: 'Failed to review project closing' }, { status: 500 });
    }
}
