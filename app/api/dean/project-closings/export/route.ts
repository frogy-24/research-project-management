import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import * as XLSX from 'xlsx';

const statusLabel: Record<string, string> = {
    SUBMITTED: 'Đã nộp',
    REVISION_REQUESTED: 'Từ chối / Yêu cầu bổ sung',
    APPROVED: 'Đã chấp nhận',
};

const projectStatusLabel: Record<string, string> = {
    DRAFT: 'Nháp',
    SUBMITTED: 'Đã nộp',
    DEAN_APPROVED: 'Khoa duyệt',
    DEAN_REVISION: 'Khoa yêu cầu sửa',
    ADMIN_REVIEW: 'Admin đang duyệt',
    COUNCIL_EVALUATING: 'Hội đồng chấm',
    APPROVED: 'Đã duyệt',
    IN_PROGRESS: 'Đang thực hiện',
    COMPLETED: 'Đã hoàn thành',
    REJECTED: 'Bị từ chối',
    SUSPENDED: 'Tạm dừng',
};

const formatDateTime = (value: Date | null | undefined) => (value ? new Date(value).toLocaleString('vi-VN') : '');

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const status = request.nextUrl.searchParams.get('status')?.trim() || '';
        const callRoundId = request.nextUrl.searchParams.get('callRoundId')?.trim() || '';
        const search = request.nextUrl.searchParams.get('search')?.trim() || '';

        const submissions = await prisma.projectClosingSubmission.findMany({
            where: {
                ...(status && status !== 'all' ? { status: status as 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' } : {}),
                project: {
                    ...(session.departmentId ? { leader: { departmentId: session.departmentId } } : {}),
                    ...(callRoundId ? { callRoundId } : {}),
                    ...(search
                        ? {
                              OR: [
                                  { title: { contains: search, mode: 'insensitive' } },
                                  { leader: { name: { contains: search, mode: 'insensitive' } } },
                                  { leader: { code: { contains: search, mode: 'insensitive' } } },
                                  { instructor: { name: { contains: search, mode: 'insensitive' } } },
                                  { callRound: { name: { contains: search, mode: 'insensitive' } } },
                              ],
                          }
                        : {}),
                },
            },
            select: {
                status: true,
                note: true,
                submittedAt: true,
                updatedAt: true,
                project: {
                    select: {
                        title: true,
                        status: true,
                        callRound: { select: { name: true } },
                        leader: { select: { name: true, code: true, email: true } },
                        instructor: { select: { name: true, code: true, email: true } },
                    },
                },
            },
            orderBy: { submittedAt: 'desc' },
        });

        const rows = submissions.map((item, index) => ({
            STT: index + 1,
            'Đề tài': item.project.title,
            'Sinh viên': item.project.leader.name,
            'MSSV/Mã': item.project.leader.code || '',
            Email: item.project.leader.email || '',
            'Giảng viên hướng dẫn': item.project.instructor?.name || '',
            'Mã GV': item.project.instructor?.code || '',
            'Email GV': item.project.instructor?.email || '',
            'Đợt đề tài': item.project.callRound?.name || '',
            'Trạng thái đề tài': projectStatusLabel[item.project.status] || item.project.status,
            'Trạng thái nghiệm thu': statusLabel[item.status] || item.status,
            'Ngày nộp': formatDateTime(item.submittedAt),
            'Cập nhật gần nhất': formatDateTime(item.updatedAt),
            'Ghi chú': item.note || '',
        }));

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 45 },
            { wch: 24 },
            { wch: 16 },
            { wch: 26 },
            { wch: 24 },
            { wch: 14 },
            { wch: 26 },
            { wch: 24 },
            { wch: 20 },
            { wch: 26 },
            { wch: 20 },
            { wch: 20 },
            { wch: 42 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Nghiem thu de tai');

        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(
            now.getHours(),
        ).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="dean-project-closings-${stamp}.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting dean project closings:', error);
        return NextResponse.json({ success: false, error: 'Failed to export project closings' }, { status: 500 });
    }
}
