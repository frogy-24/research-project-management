import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getActorUserId } from '@/lib/project-permissions';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';
import * as ExcelJS from 'exceljs';

type TeamMember = {
    name: string;
    role: string;
    studentId: string | null;
};

const teamMemberArraySchema = registrationTeamMemberSchema.array();

const parseTeamMembers = (raw: unknown): TeamMember[] => {
    const normalize = (input: unknown): TeamMember[] => {
        if (!Array.isArray(input)) return [];
        return input
            .map((item) => {
                if (!item || typeof item !== 'object') return null;
                const record = item as Record<string, unknown>;
                const name =
                    (typeof record.name === 'string' && record.name.trim()) ||
                    (typeof record.fullName === 'string' && record.fullName.trim()) ||
                    (typeof record.studentName === 'string' && record.studentName.trim()) ||
                    '';
                if (!name) return null;
                const role = typeof record.role === 'string' && record.role.trim() ? record.role : 'Thành viên';
                const studentId = typeof record.studentId === 'string' ? record.studentId : null;
                return { name, role, studentId };
            })
            .filter((member): member is TeamMember => member !== null);
    };

    if (typeof raw === 'string') {
        try {
            const parsedJson = JSON.parse(raw);
            const normalized = normalize(parsedJson);
            if (normalized.length > 0) return normalized;
        } catch {
            return [];
        }
    }

    const normalized = normalize(raw);
    if (normalized.length > 0) return normalized;

    const parsed = teamMemberArraySchema.safeParse(raw);
    if (!parsed.success) return [];
    return parsed.data.map((member) => ({ name: member.name, role: member.role, studentId: member.studentId ?? null }));
};

const formatYear = (value: Date | null | undefined): string => {
    if (!value) return '';
    return new Intl.DateTimeFormat('vi-VN', { year: 'numeric' }).format(value);
};

const formatCurrency = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const num = Number(value);
    if (Number.isNaN(num)) return '';
    return new Intl.NumberFormat('vi-VN').format(num);
};

export async function GET(req: NextRequest) {
    try {
        const userId = getActorUserId(req);
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
        if (dean.departmentId) {
            whereClause.user = { departmentId: dean.departmentId };
        }
        whereClause.instructorStatus = 'ACCEPTED';
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
                        id: true, name: true, email: true, phone: true, dateOfBirth: true,
                        gender: true, address: true, code: true,
                        departmentRef: { select: { name: true, code: true } },
                        class: { select: { name: true, code: true } },
                        major: { select: { name: true, code: true } },
                    },
                },
                instructor: {
                    select: {
                        id: true, name: true, email: true, phone: true, dateOfBirth: true,
                        gender: true, address: true, code: true, department: true,
                        departmentRef: { select: { name: true, code: true } },
                        major: { select: { name: true, code: true } },
                    },
                },
                callRound: {
                    select: {
                        name: true, budgetLimit: true, projectStartDate: true,
                        projectEndDate: true, registrationStartDate: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        // Fetch team member data
        const teamMemberIds = Array.from(
            new Set(
                registrations
                    .flatMap((reg) => parseTeamMembers(reg.teamMembers))
                    .map((member) => member.studentId)
                    .filter((id): id is string => typeof id === 'string' && id.length > 0),
            ),
        );

        const teamMemberUsers = teamMemberIds.length
            ? await prisma.user.findMany({
                  where: { id: { in: teamMemberIds } },
                  select: {
                      id: true, name: true, code: true, email: true, phone: true,
                      gender: true, dateOfBirth: true, address: true,
                      class: { select: { name: true, code: true } },
                      major: { select: { name: true, code: true } },
                      departmentRef: { select: { name: true, code: true } },
                  },
              })
            : [];

        const teamMemberUserMap = new Map(teamMemberUsers.map((u) => [u.id, u]));

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống QLCTNCKH';
        workbook.created = new Date();

        // Sheet 1: Thống kê đề tài NCKH với styling đẹp
        const worksheet = workbook.addWorksheet('Thống kê Đề tài NCKH');
        
        // Add title row
        worksheet.mergeCells('A1:P1');
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'BÁO CÁO THỐNG KÊ ĐỀ TÀI NGHIÊN CỨU KHOA HỌC';
        titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0066CC' } };
        titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(1).height = 30;

        // Add subtitle with filters info
        worksheet.mergeCells('A2:P2');
        const subtitleCell = worksheet.getCell('A2');
        const filterInfo = [];
        if (callRoundId) {
            const callRound = registrations[0]?.callRound?.name;
            if (callRound) filterInfo.push(`Đợt: ${callRound}`);
        }
        if (facultyStatus && facultyStatus !== 'ALL') {
            const statusLabel = facultyStatus === 'APPROVED' ? 'Đã duyệt' : 
                               facultyStatus === 'PENDING' ? 'Chờ duyệt' : 'Đã từ chối';
            filterInfo.push(`Trạng thái: ${statusLabel}`);
        }
        subtitleCell.value = filterInfo.length > 0 ? filterInfo.join(' | ') : 'Tất cả đề tài';
        subtitleCell.font = { name: 'Arial', size: 11, italic: true };
        subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getRow(2).height = 20;

        // Header row
        const headers = [
            'STT', 'Tên đề tài', 'Đề tài NCKH cấp', 'Đợt đăng ký', 'Khoa', 'Mã lớp',
            'Số lượng TV', 'SV tham gia', 'Mã SV', 'Vai trò',
            'Năm BĐ', 'Năm KT', 'Chủ nhiệm', 'GVHD', 'Kinh phí', 'Kết quả'
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
                right: { style: 'thin', color: { argb: 'FF000000' } }
            };
        });
        headerRow.height = 35;

        // Data rows
        let currentRow = 4;
        registrations.forEach((reg, index) => {
            const teamMembers = parseTeamMembers(reg.teamMembers);
            const memberCount = teamMembers.length;
            const projectLevel = 'Cấp Khoa';
            const startYear = formatYear(reg.callRound?.projectStartDate);
            const endYear = formatYear(reg.callRound?.projectEndDate);
            
            let result = '';
            switch (reg.facultyStatus) {
                case 'APPROVED': result = 'Đạt'; break;
                case 'REJECTED': result = 'Không đạt'; break;
                case 'PENDING': result = 'Chờ duyệt'; break;
                default: result = reg.facultyStatus;
            }

            const members = teamMembers.length ? teamMembers : [{ name: '', role: 'Thành viên', studentId: null } as TeamMember];
            const rowSpan = members.length;

            members.forEach((member, memberIndex) => {
                const row = worksheet.getRow(currentRow + memberIndex);
                const isFirstMember = memberIndex === 0;
                
                const memberName = member.studentId ? teamMemberUserMap.get(member.studentId)?.name : member.name;
                const memberCode = member.studentId ? teamMemberUserMap.get(member.studentId)?.code : member.studentId || '';

                row.getCell(1).value = isFirstMember ? index + 1 : '';
                row.getCell(2).value = isFirstMember ? reg.title : '';
                row.getCell(3).value = isFirstMember ? projectLevel : '';
                row.getCell(4).value = isFirstMember ? reg.callRound?.name || '' : '';
                row.getCell(5).value = isFirstMember ? reg.user.departmentRef?.name || '' : '';
                row.getCell(6).value = isFirstMember ? reg.user.class?.code || '' : '';
                row.getCell(7).value = isFirstMember ? memberCount : '';
                row.getCell(8).value = memberName || '';
                row.getCell(9).value = memberCode;
                row.getCell(10).value = member.role || 'Thành viên';
                row.getCell(11).value = isFirstMember ? startYear : '';
                row.getCell(12).value = isFirstMember ? endYear : '';
                row.getCell(13).value = isFirstMember ? reg.user.name : '';
                row.getCell(14).value = isFirstMember ? reg.instructor?.name || '' : '';
                row.getCell(15).value = isFirstMember ? formatCurrency(reg.callRound?.budgetLimit) : '';
                row.getCell(16).value = isFirstMember ? result : '';

                for (let col = 1; col <= 16; col++) {
                    const cell = row.getCell(col);
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
                        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
                    };
                    cell.font = { name: 'Arial', size: 10 };
                    
                    if (col === 1 || col === 7) {
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else if (col === 2) {
                        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
                    } else {
                        cell.alignment = { vertical: 'middle', horizontal: 'left' };
                    }

                    if (index % 2 === 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
                    }
                }

                row.height = 25;
            });

            // Merge cells for project info columns
            if (rowSpan > 1) {
                const mergeStart = currentRow;
                const mergeEnd = currentRow + rowSpan - 1;
                [1, 2, 3, 4, 5, 6, 7, 11, 12, 13, 14, 15, 16].forEach(col => {
                    worksheet.mergeCells(mergeStart, col, mergeEnd, col);
                });
            }

            currentRow += rowSpan;
        });

        // Set column widths
        worksheet.columns = [
            { width: 6 }, { width: 35 }, { width: 14 }, { width: 20 }, { width: 16 },
            { width: 10 }, { width: 10 }, { width: 20 }, { width: 15 }, { width: 12 },
            { width: 10 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 14 }, { width: 11 }
        ];

        // Generate buffer
        const buffer = await workbook.xlsx.writeBuffer();

        const now = new Date();
        const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const filename = callRoundId
            ? `thong-ke-de-tai-styled-${callRoundId}-${timestamp}.xlsx`
            : `thong-ke-de-tai-styled-${timestamp}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting styled dean approvals report:', error);
        return NextResponse.json({ error: 'Failed to export report' }, { status: 500 });
    }
}
