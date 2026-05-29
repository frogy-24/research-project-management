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
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
    }).format(value);
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
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        dateOfBirth: true,
                        gender: true,
                        address: true,
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
                                code: true,
                            },
                        },
                        major: {
                            select: {
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                instructor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        dateOfBirth: true,
                        gender: true,
                        address: true,
                        code: true,
                        department: true,
                        departmentRef: {
                            select: {
                                name: true,
                                code: true,
                            },
                        },
                        major: {
                            select: {
                                name: true,
                                code: true,
                            },
                        },
                    },
                },
                callRound: {
                    select: {
                        name: true,
                        budgetLimit: true,
                        projectStartDate: true,
                        projectEndDate: true,
                        registrationStartDate: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

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
                  where: {
                      id: { in: teamMemberIds },
                  },
                  select: {
                      id: true,
                      name: true,
                      code: true,
                      email: true,
                      phone: true,
                      gender: true,
                      dateOfBirth: true,
                      address: true,
                      class: {
                          select: {
                              name: true,
                              code: true,
                          },
                      },
                      major: {
                          select: {
                              name: true,
                              code: true,
                          },
                      },
                      departmentRef: {
                          select: {
                              name: true,
                              code: true,
                          },
                      },
                  },
              })
            : [];

        const teamMemberUserMap = new Map(teamMemberUsers.map((u) => [u.id, u]));

        const unresolvedMemberNames = Array.from(
            new Set(
                registrations
                    .flatMap((reg) => parseTeamMembers(reg.teamMembers))
                    .filter((m) => !m.studentId)
                    .map((m) => m.name?.trim())
                    .filter((name): name is string => Boolean(name)),
            ),
        );

        const fallbackUsersByName = unresolvedMemberNames.length
            ? await prisma.user.findMany({
                  where: { name: { in: unresolvedMemberNames } },
                  select: { name: true, code: true },
              })
            : [];
        const fallbackCodeByName = new Map<string, string>();
        fallbackUsersByName.forEach((u) => {
            const key = u.name?.trim();
            if (!key || fallbackCodeByName.has(key) || !u.code) return;
            fallbackCodeByName.set(key, u.code);
        });

        // Build export data: 1 thành viên = 1 dòng
        const exportData = registrations.flatMap((reg, index) => {
            const teamMembers = parseTeamMembers(reg.teamMembers);

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

            const members = teamMembers.length
                ? teamMembers
                : [{ name: '', role: 'Thành viên', studentId: null } as TeamMember];

            return members.map((m) => ({
                'STT': index + 1,
                'Tên đề tài': reg.title,
                'Đề tài NCKH cấp': projectLevel,
                'Đợt đăng ký': reg.callRound?.name || '',
                'Khoa': reg.user.departmentRef?.name || '',
                'Mã lớp': reg.user.class?.code || '',
                'Số lượng thành viên': memberCount,
                'Các sinh viên tham gia': (m.studentId ? teamMemberUserMap.get(m.studentId)?.name : undefined) || m.name || '',
                'Mã sinh viên tham gia':
                    (m.studentId ? teamMemberUserMap.get(m.studentId)?.code : undefined) ||
                    m.studentId ||
                    fallbackCodeByName.get(m.name?.trim() || '') ||
                    '',
                'Vai trò': m.role || 'Thành viên',
                'Năm bắt đầu': startYear,
                'Năm kết thúc': endYear,
                'Chủ nhiệm đề tài': reg.user.name,
                'Giảng viên hướng dẫn': reg.instructor?.name || '',
                'Kinh phí đề xuất': formatCurrency(reg.callRound?.budgetLimit),
                'Kết quả': result,
            }));
        });

        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();

        const headerRow = [
            'STT',
            'Tên đề tài',
            'Đề tài NCKH cấp',
            'Đợt đăng ký',
            'Khoa',
            'Mã lớp',
            'Số lượng thành viên',
            'Các sinh viên tham gia',
            'Mã sinh viên tham gia',
            'Vai trò',
            'Năm bắt đầu',
            'Năm kết thúc',
            'Chủ nhiệm đề tài',
            'Giảng viên hướng dẫn',
            'Kinh phí đề xuất',
            'Kết quả',
        ];

        // Create data array: headers then data (tránh lệch/đè header)
        const wsData = [
            headerRow,
            ...exportData.map(row => [
                row.STT,
                row['Tên đề tài'],
                row['Đề tài NCKH cấp'],
                row['Đợt đăng ký'],
                row['Khoa'],
                row['Mã lớp'],
                row['Số lượng thành viên'],
                row['Các sinh viên tham gia'],
                row['Mã sinh viên tham gia'],
                row['Vai trò'],
                row['Năm bắt đầu'],
                row['Năm kết thúc'],
                row['Chủ nhiệm đề tài'],
                row['Giảng viên hướng dẫn'],
                row['Kinh phí đề xuất'],
                row['Kết quả'],
            ]),
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);

        // Set column widths
        ws['!cols'] = [
            { wch: 5 },   // STT
            { wch: 40 },  // Tên đề tài
            { wch: 16 },  // Đề tài NCKH cấp
            { wch: 24 },  // Đợt đăng ký
            { wch: 18 },  // Khoa
            { wch: 12 },  // Mã lớp
            { wch: 16 },  // Số lượng thành viên
            { wch: 24 },  // Các sinh viên tham gia
            { wch: 20 },  // Mã sinh viên tham gia
            { wch: 14 },  // Vai trò
            { wch: 12 },  // Năm bắt đầu
            { wch: 12 },  // Năm kết thúc
            { wch: 20 },  // Chủ nhiệm đề tài
            { wch: 20 },  // Giảng viên hướng dẫn
            { wch: 16 },  // Kinh phí đề xuất
            { wch: 10 },  // Kết quả
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Thống kê Đề tài NCKH');

        const studentRows = registrations.flatMap((reg, index) => {
            const teamMembers = parseTeamMembers(reg.teamMembers);
            const baseProject = {
                sttDeTai: index + 1,
                tenDeTai: reg.title,
                dotDangKy: reg.callRound?.name || '',
            };

            const leaderRow = {
                ...baseProject,
                vaiTro: 'Chủ nhiệm',
                hoTen: reg.user.name,
                ma: reg.user.code || '',
                email: reg.user.email || '',
                soDienThoai: reg.user.phone || '',
                gioiTinh: reg.user.gender || '',
                namSinh: formatYear(reg.user.dateOfBirth),
                lop: reg.user.class?.name || '',
                maLop: reg.user.class?.code || '',
                nganh: reg.user.major?.name || '',
                maNganh: reg.user.major?.code || '',
                khoa: reg.user.departmentRef?.name || '',
                maKhoa: reg.user.departmentRef?.code || '',
                diaChi: reg.user.address || '',
            };

            const memberRows = teamMembers.map((member) => ({
                memberUser: member.studentId ? teamMemberUserMap.get(member.studentId) : undefined,
                ...baseProject,
                vaiTro: member.role || 'Thành viên',
                hoTen: (member.studentId ? teamMemberUserMap.get(member.studentId)?.name : undefined) || member.name,
                ma:
                    (member.studentId ? teamMemberUserMap.get(member.studentId)?.code : undefined) ||
                    member.studentId ||
                    '',
                email: (member.studentId ? teamMemberUserMap.get(member.studentId)?.email : undefined) || '',
                soDienThoai: (member.studentId ? teamMemberUserMap.get(member.studentId)?.phone : undefined) || '',
                gioiTinh: (member.studentId ? teamMemberUserMap.get(member.studentId)?.gender : undefined) || '',
                namSinh: formatYear(member.studentId ? teamMemberUserMap.get(member.studentId)?.dateOfBirth : null),
                lop: (member.studentId ? teamMemberUserMap.get(member.studentId)?.class?.name : undefined) || '',
                maLop: (member.studentId ? teamMemberUserMap.get(member.studentId)?.class?.code : undefined) || '',
                nganh: (member.studentId ? teamMemberUserMap.get(member.studentId)?.major?.name : undefined) || '',
                maNganh: (member.studentId ? teamMemberUserMap.get(member.studentId)?.major?.code : undefined) || '',
                khoa: (member.studentId ? teamMemberUserMap.get(member.studentId)?.departmentRef?.name : undefined) || '',
                maKhoa: (member.studentId ? teamMemberUserMap.get(member.studentId)?.departmentRef?.code : undefined) || '',
                diaChi: (member.studentId ? teamMemberUserMap.get(member.studentId)?.address : undefined) || '',
            }));

            return [leaderRow, ...memberRows];
        });

        const studentSheetData = [
            [
                'STT đề tài',
                'Tên đề tài',
                'Đợt đăng ký',
                'Vai trò',
                'Họ và tên',
                'Mã sinh viên',
                'Email',
                'Số điện thoại',
                'Giới tính',
                'Năm sinh',
                'Lớp',
                'Mã lớp',
                'Ngành',
                'Mã ngành',
                'Khoa',
                'Mã khoa',
                'Địa chỉ',
            ],
            ...studentRows.map((r) => [
                r.sttDeTai,
                r.tenDeTai,
                r.dotDangKy,
                r.vaiTro,
                r.hoTen,
                r.ma,
                r.email,
                r.soDienThoai,
                r.gioiTinh,
                r.namSinh,
                r.lop,
                r.maLop,
                r.nganh,
                r.maNganh,
                r.khoa,
                r.maKhoa,
                r.diaChi,
            ]),
        ];

        const wsStudents = XLSX.utils.aoa_to_sheet(studentSheetData);

        // Merge cột thông tin đề tài khi 1 đề tài có nhiều thành viên
        const mainMerges: XLSX.Range[] = [];
        let mainStartRow = 1; // header row = 0
        registrations.forEach((reg) => {
            const span = Math.max(parseTeamMembers(reg.teamMembers).length, 1);
            const mainEndRow = mainStartRow + span - 1;
            if (mainEndRow > mainStartRow) {
                // STT..Số lượng thành viên
                [0, 1, 2, 3, 4, 5, 6].forEach((c) => mainMerges.push({ s: { r: mainStartRow, c }, e: { r: mainEndRow, c } }));
                // Năm bắt đầu..Kết quả
                [10, 11, 12, 13, 14, 15].forEach((c) => mainMerges.push({ s: { r: mainStartRow, c }, e: { r: mainEndRow, c } }));
            }
            mainStartRow = mainEndRow + 1;
        });
        ws['!merges'] = mainMerges;

        // Merge các cột thông tin đề tài cho nhiều dòng thành viên (giống export điểm chi tiết)
        // Cột merge: STT đề tài, Tên đề tài, Đợt đăng ký
        const studentMerges: XLSX.Range[] = [];
        let startRow = 1; // row 0 là header
        registrations.forEach((reg) => {
            const memberCount = parseTeamMembers(reg.teamMembers).length;
            const rowSpan = 1 + memberCount; // 1 chủ nhiệm + n thành viên
            const endRow = startRow + rowSpan - 1;

            if (endRow > startRow) {
                // A: STT đề tài
                studentMerges.push({ s: { r: startRow, c: 0 }, e: { r: endRow, c: 0 } });
                // B: Tên đề tài
                studentMerges.push({ s: { r: startRow, c: 1 }, e: { r: endRow, c: 1 } });
                // C: Đợt đăng ký
                studentMerges.push({ s: { r: startRow, c: 2 }, e: { r: endRow, c: 2 } });
            }

            startRow = endRow + 1;
        });

        wsStudents['!merges'] = studentMerges;
        wsStudents['!cols'] = [
            { wch: 10 }, { wch: 40 }, { wch: 24 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 28 },
            { wch: 16 }, { wch: 10 }, { wch: 10 }, { wch: 16 }, { wch: 12 }, { wch: 20 }, { wch: 12 },
            { wch: 20 }, { wch: 12 }, { wch: 28 },
        ];
        XLSX.utils.book_append_sheet(wb, wsStudents, 'Sinh viên tham gia');

        const lecturerRows = registrations
            .filter((reg) => !!reg.instructor)
            .map((reg, index) => ({
                stt: index + 1,
                tenDeTai: reg.title,
                dotDangKy: reg.callRound?.name || '',
                hoTen: reg.instructor?.name || '',
                maGiangVien: reg.instructor?.code || '',
                email: reg.instructor?.email || '',
                soDienThoai: reg.instructor?.phone || '',
                gioiTinh: reg.instructor?.gender || '',
                namSinh: formatYear(reg.instructor?.dateOfBirth),
                boMonKhoaText: reg.instructor?.department || '',
                khoa: reg.instructor?.departmentRef?.name || '',
                maKhoa: reg.instructor?.departmentRef?.code || '',
                nganh: reg.instructor?.major?.name || '',
                maNganh: reg.instructor?.major?.code || '',
                diaChi: reg.instructor?.address || '',
            }));

        const lecturerSheetData = [
            [
                'STT',
                'Tên đề tài',
                'Đợt đăng ký',
                'Họ và tên',
                'Mã giảng viên',
                'Email',
                'Số điện thoại',
                'Giới tính',
                'Năm sinh',
                'Bộ môn/Khoa (text)',
                'Khoa',
                'Mã khoa',
                'Ngành',
                'Mã ngành',
                'Địa chỉ',
            ],
            ...lecturerRows.map((r) => [
                r.stt,
                r.tenDeTai,
                r.dotDangKy,
                r.hoTen,
                r.maGiangVien,
                r.email,
                r.soDienThoai,
                r.gioiTinh,
                r.namSinh,
                r.boMonKhoaText,
                r.khoa,
                r.maKhoa,
                r.nganh,
                r.maNganh,
                r.diaChi,
            ]),
        ];

        const wsLecturers = XLSX.utils.aoa_to_sheet(lecturerSheetData);
        wsLecturers['!cols'] = [
            { wch: 8 }, { wch: 40 }, { wch: 24 }, { wch: 24 }, { wch: 16 }, { wch: 28 }, { wch: 16 },
            { wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 20 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 28 },
        ];
        XLSX.utils.book_append_sheet(wb, wsLecturers, 'Thông tin giảng viên');

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