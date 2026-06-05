import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import * as ExcelJS from 'exceljs';

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
                ...(status && status !== 'all'
                    ? { status: status as 'SUBMITTED' | 'REVISION_REQUESTED' | 'APPROVED' }
                    : {}),
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

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống QLCTNCKH';
        workbook.created = new Date();

        const worksheet = workbook.addWorksheet('Nghiệm thu đề tài');

        // Title
        worksheet.mergeCells('A1:N1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'BÁO CÁO NGHIỆM THU ĐỀ TÀI NGHIÊN CỨU KHOA HỌC';
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 30;

        // Subtitle
        worksheet.mergeCells('A2:N2');
        const subtitleCell = worksheet.getCell('A2');
        const filterInfo: string[] = [];
        if (callRoundId && submissions[0]?.project.callRound?.name) {
            filterInfo.push(`Đợt: ${submissions[0].project.callRound.name}`);
        }
        if (status && status !== 'all') {
            filterInfo.push(`Trạng thái: ${statusLabel[status] || status}`);
        }
        if (search) {
            filterInfo.push(`Từ khoá: ${search}`);
        }
        subtitleCell.value = filterInfo.length > 0 ? filterInfo.join(' | ') : 'Tất cả hồ sơ nghiệm thu';
        subtitleCell.font = { name: 'Arial', size: 11, italic: true };
        subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // Header
        const headers = [
            'STT',
            'Đề tài',
            'Sinh viên',
            'MSSV/Mã',
            'Email SV',
            'Giảng viên hướng dẫn',
            'Mã GV',
            'Email GV',
            'Đợt đề tài',
            'Trạng thái đề tài',
            'Trạng thái nghiệm thu',
            'Ngày nộp',
            'Cập nhật gần nhất',
            'Ghi chú',
        ];
        const headerRow = worksheet.getRow(3);
        headers.forEach((header, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.value = header;
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            cell.border = {
                top: { style: 'thin', color: { argb: 'FF000000' } },
                left: { style: 'thin', color: { argb: 'FF000000' } },
                bottom: { style: 'thin', color: { argb: 'FF000000' } },
                right: { style: 'thin', color: { argb: 'FF000000' } },
            };
        });
        headerRow.height = 35;

        // Data
        submissions.forEach((item, index) => {
            const row = worksheet.getRow(4 + index);
            const values = [
                index + 1,
                item.project.title,
                item.project.leader.name,
                item.project.leader.code || '',
                item.project.leader.email || '',
                item.project.instructor?.name || '',
                item.project.instructor?.code || '',
                item.project.instructor?.email || '',
                item.project.callRound?.name || '',
                projectStatusLabel[item.project.status] || item.project.status,
                statusLabel[item.status] || item.status,
                formatDateTime(item.submittedAt),
                formatDateTime(item.updatedAt),
                item.note || '',
            ];
            values.forEach((v, colIdx) => {
                const cell = row.getCell(colIdx + 1);
                cell.value = v;
                cell.font = { name: 'Arial', size: 10 };
                cell.alignment = {
                    vertical: 'middle',
                    horizontal: colIdx === 1 || colIdx === 13 ? 'left' : colIdx === 0 ? 'center' : 'left',
                    wrapText: colIdx === 1 || colIdx === 13,
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                    right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                };
                if (index % 2 === 0) {
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
                }
            });
            row.height = 25;
        });

        worksheet.columns = [
            { width: 6 },
            { width: 45 },
            { width: 24 },
            { width: 16 },
            { width: 26 },
            { width: 24 },
            { width: 14 },
            { width: 26 },
            { width: 24 },
            { width: 20 },
            { width: 26 },
            { width: 20 },
            { width: 20 },
            { width: 42 },
        ];

        const buffer = await workbook.xlsx.writeBuffer();
        const now = new Date();
        const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="dean-project-closings-styled-${stamp}.xlsx"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting styled dean project closings:', error);
        return NextResponse.json({ success: false, error: 'Failed to export project closings' }, { status: 500 });
    }
}
