import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId } from '@/lib/project-permissions';

/**
 * POST /api/dean/auto-approval/[id]/confirm
 * Xác nhận và áp dụng kết quả duyệt tự động từ AI
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const userId = getActorUserId(request);
        
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if user is DEAN
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user || user.role !== 'DEAN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const jobId = params.id;

        // Fetch job from database
        const job = await prisma.autoApprovalJob.findUnique({
            where: { id: jobId },
        });

        if (!job) {
            return NextResponse.json({ error: 'Job not found' }, { status: 404 });
        }

        if (job.status !== 'COMPLETED') {
            return NextResponse.json(
                { error: 'Job is not completed yet' },
                { status: 400 }
            );
        }

        // Parse results
        const results = job.results as any;
        if (!results?.evaluations || !Array.isArray(results.evaluations)) {
            return NextResponse.json(
                { error: 'No evaluations found in job results' },
                { status: 400 }
            );
        }

        const evaluations = results.evaluations as Array<{
            registrationId: string;
            projectId: string;
            projectTitle: string;
            decision: 'APPROVE' | 'REVISION' | 'REJECT' | 'ERROR';
            reason: string;
            score: number;
        }>;

        // Apply decisions to project registrations
        let successCount = 0;
        let errorCount = 0;

        for (const evaluation of evaluations) {
            try {
                // Skip ERROR decisions
                if (evaluation.decision === 'ERROR') {
                    errorCount++;
                    continue;
                }

                // Map AI decision to registration status
                let status: 'APPROVED' | 'REJECTED' | 'PENDING';
                switch (evaluation.decision) {
                    case 'APPROVE':
                        status = 'APPROVED';
                        break;
                    case 'REVISION':
                        // For revision, we keep it PENDING with a note
                        status = 'PENDING';
                        break;
                    case 'REJECT':
                        status = 'REJECTED';
                        break;
                    default:
                        continue;
                }

                // Find the registration
                const registration = await prisma.projectRegistration.findUnique({
                    where: { id: evaluation.registrationId },
                });

                if (!registration) {
                    console.error(`Registration ${evaluation.registrationId} not found`);
                    errorCount++;
                    continue;
                }

                // Update project registration
                await prisma.projectRegistration.update({
                    where: { id: evaluation.registrationId },
                    data: {
                        facultyStatus: status,
                        status: status,
                        facultyReviewerId: userId,
                    },
                });

                successCount++;
            } catch (error) {
                console.error(`Error updating registration ${evaluation.registrationId}:`, error);
                errorCount++;
            }
        }

        return NextResponse.json({
            success: true,
            applied: successCount,
            errors: errorCount,
            total: evaluations.length,
        });
    } catch (error) {
        console.error('Error confirming auto approval:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
