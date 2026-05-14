import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId, getActorRole } from '@/lib/project-permissions';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';
import * as XLSX from 'xlsx';

type TeamMember = {
    name: string;
    role: string;
    studentId: string | null;
};

const teamMemberArraySchema = registrationTeamMemberSchema.array();

const parseTeamMembers = (raw: unknown): TeamMember[] => {
    const parsed = teamMemberArraySchema.safeParse(raw);
    if (!parsed.success) {
        return [];
    }
    return parsed.data.map((member) => ({
        name: member.name,
        role: member.role,
        studentId: member.studentId ?? null,
    }));
};

const formatYear = (value: Date | null | undefined): string => {
    if (!value) return '';
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
    }).format(value);
};

export async function GET(req: NextRequest) {
    try {
        const userId = getActorUserId(req);
        const role = getActorRole(req);
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const dean = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!dean || dean.role !== 'DEAN') {
            return NextResponse.json({ error: 'Forbidden: Only Dean can access' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const callRoundId = searchParams.get('callRoundId') || '';
        const facultyStatus = searchParams.get('facultyStatus') || '';

        // Build query
        const whereClause: any = {};

        // Filter by dean's department
        if (dean.departmentId) {
            whereClause.user = { departmentId: dean.departmentId };
        }

        // Chỉ hiển thị đề tài đã được giảng viên hướng dẫn chấp nhận
        whereClause.instructorStatus = 'ACCEPTED';

        // Chỉ hiển thị đề tài đã được duyệt cấp Khoa (mặc định)
        // Nếu facultyStatus = 'ALL' thì không lọc theo trạng thái
        if (facultyStatus && facultyStatus !== 'ALL') {
            whereClause.facultyStatus = facultyStatus;
        }

        if (callRoundId) {
            whereClause.callRoundId = callRoundId;
        }

        const registrations = await prisma.projectRegistration.findMany({
            where: whereClause,
            include: {
                user: {
                    select: {
                        name: true,
                        code: true,
                        departmentRef: {
                            select: {
                                name: true,
                                code: true,
                            },
                        },
                        class: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                instructor: {
                    select: {
                        name: true,
                        code: true,
                        departmentRef: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                callRound: {
                    select: {
                        name: true,
                        projectStartDate: true,
                        projectEndDate: true,
                        registrationStartDate: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Build export data
        const exportData = registrations.map((reg, index) => {
            const teamMembers = parseTeamMembers(reg.teamMembers);

            // Tên các sinh viên tham gia
            const memberNames = teamMembers.map((m) => m.name).join(', ');

            // Số lượng thành viên (không tính chủ nhiệm)
            const memberCount = teamMembers.length;

            // Xác định cấp đề tài
            const projectLevel = 'Cấp Khoa';

            // Năm bắt đầu và kết thúc từ callRound
            const startYear = formatYear(reg.callRound?.projectStartDate);
            const endYear = formatYear(reg.callRound?.projectEndDate);

            // Kết quả - dựa vào facultyStatus
            let result = '';
            switch (reg.facultyStatus) {
                case 'APPROVED':
                    result = 'Đạt';
                    break;
                case 'REJECTED':
                    result = 'Không đạt';
                    break;
                case 'PENDING':
                    result = 'Chờ duyệt';
                    break;
                default:
                    result = reg.facultyStatus;
            }

            return {
                'STT': index + 1,
                'Các sinh viên tham gia': memberNames,
                'Tên đề tài': reg.title,
                'Đề tài cấp': projectLevel,
                'Năm bắt đầu': startYear,
                'Năm kết thúc': endYear,
                'Chủ nhiệm đề tài': reg.user.name,
                'Giảng viên hướng dẫn': reg.instructor?.name || '',
                'Số lượng thành viên': memberCount,
                'Kết quả': result,
            };
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();

        // Title row
        const titleRow = ['DANH SÁCH THỐNG KÊ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC CẤP KHOA'];
        const headerRow = [
            'STT',
            'Các sinh viên tham gia',
            'Tên đề tài',
            'Đề tài cấp',
            'Năm bắt đầu',
            'Năm kết thúc',
            'Chủ nhiệm đề tài',
            'Giảng viên hướng dẫn',
            'Số lượng thành viên',
            'Kết quả',
        ];

        // Create data array with title, empty row, headers, then data
        const wsData = [
            titleRow,
            [],
            headerRow,
            ...exportData.map(row => [
                row.STT,
                row['Các sinh viên tham gia'],
                row['Tên đề tài'],
                row['Đề tài cấp'],
                row['Năm bắt đầu'],
                row['Năm kết thúc'],
                row['Chủ nhiệm đề tài'],
                row['Giảng viên hướng dẫn'],
                row['Số lượng thành viên'],
                row['Kết quả'],
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // STT
            { wch: 25 },  // Các sinh viên tham gia
            { wch: 40 },  // Tên đề tài
            { wch: 12 },  // Đề tài cấp
            { wch: 12 },  // Năm bắt đầu
            { wch: 12 },  // Năm kết thúc
            { wch: 20 },  // Chủ nhiệm đề tài
            { wch: 20 },  // Giảng viên hướng dẫn
            { wch: 15 },  // Số lượng thành viên
            { wch: 10 },  // Kết quả
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Thống kê Đề tài NCKH');

        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const filename = callRoundId
            ? `thong-ke-de-tai-nckh-khoa-${callRoundId}-${timestamp}.xlsx`
            : `thong-ke-de-tai-nckh-khoa-${timestamp}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting dean approvals report:', error);
        return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
    }
}