import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';
import * as ExcelJS from 'exceljs';

const teamMemberArraySchema = registrationTeamMemberSchema.array();

type TeamMember = {
    name: string;
    role: string;
    studentUserId: string | null;
    studentCode: string | null;
    className: string | null;
};

type ProjectCouncilContext = {
    callRoundId: string;
    callRoundName: string;
    callRoundRegistrationStartDate: Date | null;
    callRoundRegistrationEndDate: Date | null;
    councilId: string;
    councilName: string;
    defenseDate: Date | null;
    defenseLocation: string | null;
    projectRegistrationId: string;
    projectRegistrationTitle: string;
    projectRegistrationObjective: string;
    registrationStatus: string;
    instructorStatus: string;
    facultyStatus: string;
    advisorName: string;
    advisorCode: string;
    advisorEmail: string;
    advisorDepartment: string;
    advisorMajor: string;
    leaderName: string;
    leaderCode: string;
    leaderEmail: string;
    leaderDepartment: string;
    leaderMajor: string;
    leaderClass: string;
    teamMembersText: string;
    teamMembers: TeamMember[];
};

type ExportRow = {
    projectId: string;
    projectRegistrationId: string;
    callRoundName: string;
    callRoundRegistrationPeriod: string;
    councilName: string;
    defenseDate: string;
    defenseLocation: string;
    projectTitle: string;
    projectObjective: string;
    projectRegistrationTitle: string;
    projectRegistrationObjective: string;
    registrationStatus: string;
    instructorStatus: string;
    facultyStatus: string;
    advisorName: string;
    advisorCode: string;
    advisorEmail: string;
    advisorDepartment: string;
    advisorMajor: string;
    leaderName: string;
    leaderCode: string;
    leaderEmail: string;
    leaderDepartment: string;
    leaderMajor: string;
    leaderClass: string;
    teamMembersText: string;
    memberName: string;
    memberStudentId: string;
    memberClass: string;
    memberRole: string;
    evaluatorName: string;
    evaluatorCode: string;
    evaluatorEmail: string;
    evaluatorDepartment: string;
    evaluatorMajor: string;
    score: string;
    decision: string;
    comment: string;
    evaluatedAt: string;
};

const decisionLabelMap: Record<string, string> = {
    PASS: 'Đạt',
    NEED_REVISION: 'Cần sửa đổi',
    FAIL: 'Không đạt',
};

const parseTeamMembers = (raw: unknown): TeamMember[] => {
    const parsed = teamMemberArraySchema.safeParse(raw);
    if (!parsed.success) {
        return [];
    }

    return parsed.data.map((member) => ({
        name: member.name,
        role: member.role,
        studentUserId: member.studentId ?? null,
        studentCode: (member as { studentCode?: string | null }).studentCode ?? null,
        className: (member as { className?: string | null }).className ?? null,
    }));
};

const formatDateTime = (value: Date | null | undefined): string => {
    if (!value) {
        return '';
    }
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(value);
};

const formatDate = (value: Date | null | undefined): string => {
    if (!value) {
        return '';
    }
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(value);
};

const safeText = (value: string | null | undefined): string => value?.trim() || '';

const getDecisionLabel = (decision: string): string => decisionLabelMap[decision] || decision;

const normalizeSheetName = (name: string, index: number): string => {
    const fallback = `Hoi dong ${index + 1}`;
    const safeName = (name || fallback).replace(/[\\/?*\[\]:]/g, ' ').trim();
    return (safeName || fallback).slice(0, 31);
};

// Style helpers (exceljs)
const THIN_BORDER = {
    top: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
    left: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
    right: { style: 'thin' as const, color: { argb: 'FFD0D0D0' } },
};
const HEADER_BORDER = {
    top: { style: 'thin' as const, color: { argb: 'FF000000' } },
    left: { style: 'thin' as const, color: { argb: 'FF000000' } },
    bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
    right: { style: 'thin' as const, color: { argb: 'FF000000' } },
};
const PRIMARY_COLOR = 'FF0066CC';
const ALT_ROW_COLOR = 'FFF8F9FA';

const styleHeaderCell = (cell: ExcelJS.Cell) => {
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = HEADER_BORDER;
};

const styleDataCell = (cell: ExcelJS.Cell, colIndex: number, centerCols: number[], altRow: boolean) => {
    cell.font = { name: 'Arial', size: 10 };
    cell.border = THIN_BORDER;
    const isCenter = centerCols.includes(colIndex);
    cell.alignment = {
        vertical: 'middle',
        horizontal: isCenter ? 'center' : 'left',
        wrapText: colIndex === 1 || colIndex === 2,
    };
    if (altRow) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT_ROW_COLOR } };
    }
};

const addTitleBlock = (
    worksheet: ExcelJS.Worksheet,
    title: string,
    subtitle: string,
    columnCount: number,
) => {
    const lastCol = worksheet.getColumn(columnCount);
    const colLetter = lastCol.letter || String.fromCharCode(64 + columnCount);
    worksheet.mergeCells(`A1:${colLetter}1`);
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 30;

    worksheet.mergeCells(`A2:${colLetter}2`);
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = subtitle;
    subtitleCell.font = { name: 'Arial', size: 11, italic: true };
    subtitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;
};

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const callRoundId = request.nextUrl.searchParams.get('callRoundId');
        const keyword = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() || '';
        const mode = request.nextUrl.searchParams.get('mode') || 'detail';

        const callRounds = await prisma.callRound.findMany({
            where: {
                createdById: session.userId,
                ...(callRoundId ? { id: callRoundId } : {}),
            },
            select: {
                id: true,
                name: true,
            },
        });

        const callRoundIds = callRounds.map((round) => round.id);

        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'Hệ thống QLCTNCKH';
        workbook.created = new Date();

        if (callRoundIds.length === 0) {
            const ws = workbook.addWorksheet('Ket qua cham diem');
            ws.mergeCells('A1:I1');
            const t = ws.getCell('A1');
            t.value = 'BÁO CÁO KẾT QUẢ CHẤM ĐIỂM HỘI ĐỒNG';
            t.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
            t.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
            t.alignment = { vertical: 'middle', horizontal: 'center' };
            ws.getRow(1).height = 30;
            ws.mergeCells('A2:I2');
            const s = ws.getCell('A2');
            s.value = 'Không có dữ liệu theo bộ lọc hiện tại.';
            s.font = { name: 'Arial', size: 11, italic: true };
            s.alignment = { vertical: 'middle', horizontal: 'center' };
            ws.getRow(2).height = 20;
            ws.getColumn(1).width = 60;

            const buffer = await workbook.xlsx.writeBuffer();
            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': 'attachment; filename="dean-council-evaluations-empty.xlsx"',
                    'Cache-Control': 'no-store',
                },
            });
        }

        const assignments = await prisma.projectCouncilAssignment.findMany({
            where: {
                council: {
                    callRoundId: {
                        in: callRoundIds,
                    },
                },
            },
            select: {
                projectRegistrationId: true,
                projectRegistration: {
                    select: {
                        id: true,
                        title: true,
                        objective: true,
                        status: true,
                        instructorStatus: true,
                        facultyStatus: true,
                        teamMembers: true,
                        instructor: {
                            select: {
                                name: true,
                                code: true,
                                email: true,
                                departmentRef: { select: { name: true } },
                                major: { select: { name: true } },
                            },
                        },
                        user: {
                            select: {
                                name: true,
                                code: true,
                                email: true,
                                departmentRef: { select: { name: true } },
                                major: { select: { name: true } },
                                class: { select: { name: true } },
                            },
                        },
                    },
                },
                council: {
                    select: {
                        id: true,
                        name: true,
                        defenseDate: true,
                        defenseLocation: true,
                        callRoundId: true,
                        callRound: {
                            select: {
                                name: true,
                                registrationStartDate: true,
                                registrationEndDate: true,
                            },
                        },
                    },
                },
            },
        });

        const registrationContextMap = new Map<string, ProjectCouncilContext>();

        assignments.forEach((assignment) => {
            const parsedMembers = parseTeamMembers(assignment.projectRegistration.teamMembers);
            const teamMembersText = parsedMembers
                .map((member, index) => {
                    const rolePart = member.role ? ` - ${member.role}` : '';
                    const idPart = member.studentCode ? ` [${member.studentCode}]` : '';
                    return `${index + 1}. ${member.name}${rolePart}${idPart}`;
                })
                .join(' | ');

            registrationContextMap.set(assignment.projectRegistrationId, {
                callRoundId: assignment.council.callRoundId,
                callRoundName: assignment.council.callRound.name,
                callRoundRegistrationStartDate: assignment.council.callRound.registrationStartDate,
                callRoundRegistrationEndDate: assignment.council.callRound.registrationEndDate,
                councilId: assignment.council.id,
                councilName: assignment.council.name,
                defenseDate: assignment.council.defenseDate,
                defenseLocation: assignment.council.defenseLocation,
                projectRegistrationId: assignment.projectRegistration.id,
                projectRegistrationTitle: assignment.projectRegistration.title,
                projectRegistrationObjective: assignment.projectRegistration.objective,
                registrationStatus: assignment.projectRegistration.status,
                instructorStatus: assignment.projectRegistration.instructorStatus,
                facultyStatus: assignment.projectRegistration.facultyStatus,
                advisorName: safeText(assignment.projectRegistration.instructor?.name),
                advisorCode: safeText(assignment.projectRegistration.instructor?.code),
                advisorEmail: safeText(assignment.projectRegistration.instructor?.email),
                advisorDepartment: safeText(assignment.projectRegistration.instructor?.departmentRef?.name),
                advisorMajor: safeText(assignment.projectRegistration.instructor?.major?.name),
                leaderName: safeText(assignment.projectRegistration.user.name),
                leaderCode: safeText(assignment.projectRegistration.user.code),
                leaderEmail: safeText(assignment.projectRegistration.user.email),
                leaderDepartment: safeText(assignment.projectRegistration.user.departmentRef?.name),
                leaderMajor: safeText(assignment.projectRegistration.user.major?.name),
                leaderClass: safeText(assignment.projectRegistration.user.class?.name),
                teamMembersText,
                teamMembers: parsedMembers,
            });
        });

        const teamMemberUserIds = Array.from(
            new Set(
                Array.from(registrationContextMap.values())
                    .flatMap((ctx) => ctx.teamMembers)
                    .map((m) => m.studentUserId)
                    .filter((id): id is string => Boolean(id)),
            ),
        );

        const teamMemberUsers = teamMemberUserIds.length
            ? await prisma.user.findMany({
                  where: { id: { in: teamMemberUserIds } },
                  select: {
                      id: true,
                      code: true,
                      class: { select: { name: true } },
                  },
              })
            : [];
        const teamMemberUserMap = new Map(teamMemberUsers.map((u) => [u.id, u]));

        const unresolvedMemberNames = Array.from(
            new Set(
                Array.from(registrationContextMap.values())
                    .flatMap((ctx) => ctx.teamMembers)
                    .filter((m) => !m.studentUserId)
                    .map((m) => safeText(m.name))
                    .filter(Boolean),
            ),
        );

        const fallbackUsersByName = unresolvedMemberNames.length
            ? await prisma.user.findMany({
                  where: { name: { in: unresolvedMemberNames } },
                  select: {
                      name: true,
                      code: true,
                      class: { select: { name: true } },
                  },
              })
            : [];
        const fallbackMemberByNameMap = new Map<string, { code: string | null; className: string | null }>();
        fallbackUsersByName.forEach((u) => {
            const key = safeText(u.name);
            if (!key || fallbackMemberByNameMap.has(key)) return;
            fallbackMemberByNameMap.set(key, {
                code: u.code ?? null,
                className: u.class?.name ?? null,
            });
        });

        registrationContextMap.forEach((ctx, key) => {
            const resolvedMembers = ctx.teamMembers.map((m) => {
                const u = m.studentUserId ? teamMemberUserMap.get(m.studentUserId) : undefined;
                return {
                    ...m,
                    studentCode: u?.code ?? m.studentCode ?? fallbackMemberByNameMap.get(safeText(m.name))?.code ?? m.studentUserId ?? null,
                    className: u?.class?.name ?? m.className ?? fallbackMemberByNameMap.get(safeText(m.name))?.className ?? null,
                };
            });
            const teamMembersText = resolvedMembers
                .map((member, index) => {
                    const rolePart = member.role ? ` - ${member.role}` : '';
                    const idPart = member.studentCode ? ` [${member.studentCode}]` : '';
                    return `${index + 1}. ${member.name}${rolePart}${idPart}`;
                })
                .join(' | ');
            registrationContextMap.set(key, { ...ctx, teamMembers: resolvedMembers, teamMembersText });
        });

        const registrationIds = Array.from(registrationContextMap.keys());

        const projects = await prisma.project.findMany({
            where: {
                leader: {
                    registrations: {
                        some: { id: { in: registrationIds } },
                    },
                },
            },
            select: {
                id: true,
                title: true,
                objective: true,
                leader: {
                    select: {
                        registrations: {
                            where: { id: { in: registrationIds } },
                            select: { id: true },
                        },
                    },
                },
            },
        });

        const projectContextMap = new Map<string, ProjectCouncilContext & { projectTitle: string; projectObjective: string }>();

        projects.forEach((project) => {
            const matchedContext = project.leader.registrations
                .map((registration) => registrationContextMap.get(registration.id))
                .find((context): context is ProjectCouncilContext => Boolean(context));

            if (!matchedContext) {
                return;
            }

            projectContextMap.set(project.id, {
                ...matchedContext,
                projectTitle: project.title,
                projectObjective: project.objective,
            });
        });

        const projectIds = Array.from(projectContextMap.keys());

        const evaluations = await prisma.councilEvaluation.findMany({
            where: { projectId: { in: projectIds } },
            include: {
                councilMember: {
                    select: {
                        name: true,
                        code: true,
                        email: true,
                        departmentRef: { select: { name: true } },
                        major: { select: { name: true } },
                    },
                },
            },
            orderBy: { evaluatedAt: 'desc' },
        });

        const exportRows: ExportRow[] = evaluations
            .flatMap((evaluation) => {
                const context = projectContextMap.get(evaluation.projectId);
                if (!context) {
                    return [];
                }

                const periodStart = formatDate(context.callRoundRegistrationStartDate);
                const periodEnd = formatDate(context.callRoundRegistrationEndDate);
                const members = context.teamMembers.length
                    ? context.teamMembers
                    : [
                          {
                              name: context.leaderName,
                              studentUserId: null,
                              studentCode: context.leaderCode || null,
                              className: context.leaderClass || null,
                              role: 'Nhóm trưởng',
                          },
                      ];

                return members.map((member) => ({
                    projectId: evaluation.projectId,
                    projectRegistrationId: context.projectRegistrationId,
                    callRoundName: context.callRoundName,
                    callRoundRegistrationPeriod: periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : '',
                    councilName: context.councilName,
                    defenseDate: formatDateTime(context.defenseDate),
                    defenseLocation: safeText(context.defenseLocation),
                    projectTitle: context.projectTitle,
                    projectObjective: context.projectObjective,
                    projectRegistrationTitle: context.projectRegistrationTitle,
                    projectRegistrationObjective: context.projectRegistrationObjective,
                    registrationStatus: context.registrationStatus,
                    instructorStatus: context.instructorStatus,
                    facultyStatus: context.facultyStatus,
                    advisorName: context.advisorName,
                    advisorCode: context.advisorCode,
                    advisorEmail: context.advisorEmail,
                    advisorDepartment: context.advisorDepartment,
                    advisorMajor: context.advisorMajor,
                    leaderName: context.leaderName,
                    leaderCode: context.leaderCode,
                    leaderEmail: context.leaderEmail,
                    leaderDepartment: context.leaderDepartment,
                    leaderMajor: context.leaderMajor,
                    leaderClass: context.leaderClass,
                    teamMembersText: context.teamMembersText,
                    memberName: safeText(member.name),
                    memberStudentId: safeText(member.studentCode ?? ''),
                    memberClass: safeText(member.className ?? ''),
                    memberRole: safeText(member.role),
                    evaluatorName: safeText(evaluation.councilMember.name),
                    evaluatorCode: safeText(evaluation.councilMember.code),
                    evaluatorEmail: safeText(evaluation.councilMember.email),
                    evaluatorDepartment: safeText(evaluation.councilMember.departmentRef?.name),
                    evaluatorMajor: safeText(evaluation.councilMember.major?.name),
                    score: String(evaluation.score),
                    decision: getDecisionLabel(evaluation.decision),
                    comment: safeText(evaluation.comment),
                    evaluatedAt: formatDateTime(evaluation.evaluatedAt),
                }));
            })
            .filter((row): row is ExportRow => row !== null);

        const filteredRows = keyword
            ? exportRows.filter((row) => {
                  const searchableText = [
                      row.callRoundName,
                      row.councilName,
                      row.projectTitle,
                      row.projectRegistrationTitle,
                      row.advisorName,
                      row.leaderName,
                      row.evaluatorName,
                      row.comment,
                      row.teamMembersText,
                  ]
                      .join(' ')
                      .toLowerCase();
                  return searchableText.includes(keyword);
              })
            : exportRows;

        const councilProjectRankMap = new Map<string, Map<string, string>>();

        const councilProjectScores = new Map<string, Map<string, { projectTitle: string; scores: number[] }>>();
        filteredRows.forEach((row) => {
            const councilMap = councilProjectScores.get(row.councilName) ?? new Map();
            const projectItem = councilMap.get(row.projectId);
            if (!projectItem) {
                councilMap.set(row.projectId, {
                    projectTitle: row.projectTitle,
                    scores: [Number(row.score)],
                });
            } else {
                projectItem.scores.push(Number(row.score));
            }
            councilProjectScores.set(row.councilName, councilMap);
        });

        const now = new Date();
        const timeStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const filterLabel = callRoundId
            ? `Bộ lọc đợt đề tài: ${callRounds.find((r) => r.id === callRoundId)?.name || callRoundId}`
            : 'Bộ lọc đợt đề tài: Tất cả';

        if (mode === 'ranking') {
            const projectStatsByCouncil = new Map<
                string,
                Map<string, { projectTitle: string; callRoundName: string; scores: number[] }>
            >();

            filteredRows.forEach((row) => {
                const councilMap = projectStatsByCouncil.get(row.councilName) ?? new Map();
                const key = row.projectTitle;
                const existing = councilMap.get(key);
                if (!existing) {
                    councilMap.set(key, {
                        projectTitle: row.projectTitle,
                        callRoundName: row.callRoundName,
                        scores: [Number(row.score)],
                    });
                } else {
                    existing.scores.push(Number(row.score));
                }
                projectStatsByCouncil.set(row.councilName, councilMap);
            });

            if (projectStatsByCouncil.size === 0) {
                const ws = workbook.addWorksheet('Top 3');
                addTitleBlock(ws, 'BÁO CÁO XẾP HẠNG HỘI ĐỒNG (TOP 3)', 'Không có dữ liệu theo bộ lọc hiện tại.', 6);
                ws.getColumn(1).width = 60;
            } else {
                Array.from(projectStatsByCouncil.entries()).forEach(([councilName, projectMap], index) => {
                    const ranking = Array.from(projectMap.values())
                        .map((item) => {
                            const avg = item.scores.reduce((sum, score) => sum + score, 0) / item.scores.length;
                            return {
                                ...item,
                                averageScore: Number(avg.toFixed(2)),
                                totalEvaluations: item.scores.length,
                            };
                        })
                        .sort((a, b) => b.averageScore - a.averageScore)
                        .map((item, rankIndex) => ({
                            ...item,
                            rankLabel: rankIndex === 0 ? 'Nhất' : rankIndex === 1 ? 'Nhì' : rankIndex === 2 ? 'Ba' : '',
                        }));

                    const ws = workbook.addWorksheet(normalizeSheetName(councilName, index));
                    addTitleBlock(ws, 'BẢNG XẾP HẠNG TOP 3 ĐỀ TÀI', `Hội đồng: ${councilName}`, 12);

                    const headers = [
                        'Xếp hạng hội đồng',
                        'Đề tài',
                        'Đợt đề tài',
                        'Thành viên',
                        'Mã sinh viên',
                        'Lớp',
                        'Chức vụ',
                        'Người hướng dẫn',
                        'Ngày bảo vệ',
                        'Nơi bảo vệ',
                        'Điểm trung bình',
                        'Số lượt chấm',
                    ];

                    const headerRow = ws.getRow(4);
                    headers.forEach((h, i) => {
                        const cell = headerRow.getCell(i + 1);
                        cell.value = h;
                        styleHeaderCell(cell);
                    });
                    headerRow.height = 35;

                    const colWidths = [10, 50, 26, 24, 16, 14, 14, 28, 20, 28, 18, 14];
                    colWidths.forEach((w, i) => {
                        ws.getColumn(i + 1).width = w;
                    });

                    let currentRow = 5;
                    const centerCols = [0, 4, 5, 10, 11];
                    ranking.forEach((item) => {
                        const members = filteredRows
                            .filter((r) => r.councilName === councilName && r.projectTitle === item.projectTitle)
                            .map((m) => ({
                                memberName: m.memberName || '-',
                                memberStudentId: m.memberStudentId || '-',
                                memberClass: m.memberClass || '-',
                                memberRole: m.memberRole || '-',
                            }))
                            .filter(
                                (m, i, arr) =>
                                    arr.findIndex(
                                        (x) =>
                                            x.memberName === m.memberName &&
                                            x.memberStudentId === m.memberStudentId &&
                                            x.memberClass === m.memberClass &&
                                            x.memberRole === m.memberRole,
                                    ) === i,
                            );

                        const sampleRow = filteredRows.find((r) => r.councilName === councilName && r.projectTitle === item.projectTitle);
                        const memberRows = members.length
                            ? members
                            : [{ memberName: '-', memberStudentId: '-', memberClass: '-', memberRole: '-' }];

                        memberRows.forEach((m, idx) => {
                            const row = ws.getRow(currentRow);
                            const isFirst = idx === 0;
                            const values = [
                                isFirst ? item.rankLabel : '',
                                isFirst ? item.projectTitle : '',
                                isFirst ? item.callRoundName : '',
                                m.memberName,
                                m.memberStudentId,
                                m.memberClass,
                                m.memberRole,
                                isFirst ? sampleRow?.advisorName || '' : '',
                                isFirst ? sampleRow?.defenseDate || '' : '',
                                isFirst ? sampleRow?.defenseLocation || '' : '',
                                isFirst ? item.averageScore : '',
                                isFirst ? item.totalEvaluations : '',
                            ];
                            const altRow = ranking.indexOf(item) % 2 === 0;
                            values.forEach((v, i) => {
                                const cell = row.getCell(i + 1);
                                cell.value = v;
                                styleDataCell(cell, i, centerCols, altRow);
                                if (i === 0 && isFirst) {
                                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0066CC' } };
                                }
                            });
                            row.height = 25;
                            currentRow += 1;
                        });
                    });
                });
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const fileName = callRoundId
                ? `dean-council-rankings-styled-${callRoundId}-${timeStamp}.xlsx`
                : `dean-council-rankings-styled-all-${timeStamp}.xlsx`;

            return new NextResponse(buffer, {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                    'Cache-Control': 'no-store',
                },
            });
        }

        // === Detail mode ===
        const isFilteredByCallRound = Boolean(callRoundId);
        const headers = isFilteredByCallRound
            ? [
                  'STT',
                  'Đề tài',
                  'Hội đồng',
                  'Thành viên',
                  'Mã sinh viên',
                  'Lớp',
                  'Chức vụ',
                  'Người hướng dẫn',
                  'Ngày bảo vệ',
                  'Nơi bảo vệ',
                  'Người chấm',
                  'Điểm',
                  'Quyết định',
                  'Thời gian chấm',
                  'Nhận xét',
                  'Xếp hạng hội đồng',
              ]
            : [
                  'STT',
                  'Đợt đề tài',
                  'Đề tài',
                  'Hội đồng',
                  'Thành viên',
                  'Mã sinh viên',
                  'Lớp',
                  'Chức vụ',
                  'Người hướng dẫn',
                  'Ngày bảo vệ',
                  'Nơi bảo vệ',
                  'Người chấm',
                  'Điểm',
                  'Quyết định',
                  'Thời gian chấm',
                  'Nhận xét',
                  'Xếp hạng hội đồng',
              ];

        const sortedRows = [...filteredRows].sort((a, b) => {
            if (!isFilteredByCallRound) {
                const callRoundCompare = a.callRoundName.localeCompare(b.callRoundName, 'vi');
                if (callRoundCompare !== 0) return callRoundCompare;
            }
            const councilCompare = a.councilName.localeCompare(b.councilName, 'vi');
            if (councilCompare !== 0) return councilCompare;
            const projectCompare = a.projectTitle.localeCompare(b.projectTitle, 'vi');
            if (projectCompare !== 0) return projectCompare;
            return a.evaluatorName.localeCompare(b.evaluatorName, 'vi');
        });

        const ws = workbook.addWorksheet('Ket qua cham diem');
        addTitleBlock(
            ws,
            'BÁO CÁO KẾT QUẢ CHẤM ĐIỂM HỘI ĐỒNG',
            filterLabel,
            headers.length,
        );

        const colWidths = isFilteredByCallRound
            ? [6, 40, 24, 24, 16, 14, 14, 28, 20, 28, 24, 10, 16, 20, 52, 20]
            : [6, 24, 40, 24, 24, 16, 14, 14, 28, 20, 28, 24, 10, 16, 20, 48, 20];
        colWidths.forEach((w, i) => {
            ws.getColumn(i + 1).width = w;
        });

        const headerRow = ws.getRow(4);
        headers.forEach((h, i) => {
            const cell = headerRow.getCell(i + 1);
            cell.value = h;
            styleHeaderCell(cell);
        });
        headerRow.height = 35;

        const centerCols = isFilteredByCallRound ? [0, 4, 5, 11, 15] : [0, 5, 6, 12, 16];
        const mergeColumns = isFilteredByCallRound
            ? [0, 1, 2, 7, 8, 9, 10, 11, 12, 13, 14, 15]
            : [0, 1, 2, 3, 8, 9, 10, 11, 12, 13, 14, 15, 16];

        let sttCounter = 0;
        let lastProjectSttKey = '';
        let currentRow = 5;
        const mergeKeys: Array<{ start: number; end: number; key: string }> = [];
        let mergeStart = -1;
        let mergeKey = '';
        let altIdx = 0;

        sortedRows.forEach((row) => {
            const projectSttKey = `${row.callRoundName}__${row.councilName}__${row.projectId}`;
            if (projectSttKey !== lastProjectSttKey) {
                sttCounter += 1;
                lastProjectSttKey = projectSttKey;
            }

            const rank = councilProjectScores.get(row.councilName);
            const rankLabel = (() => {
                if (!rank) return '';
                const arr = Array.from(rank.entries())
                    .map(([pid, item]) => ({
                        pid,
                        avg: item.scores.reduce((s, x) => s + x, 0) / item.scores.length,
                    }))
                    .sort((a, b) => b.avg - a.avg);
                const idx = arr.findIndex((x) => x.pid === row.projectId);
                if (idx === 0) return 'Nhất';
                if (idx === 1) return 'Nhì';
                if (idx === 2) return 'Ba';
                return '';
            })();

            const excelRow = ws.getRow(currentRow);
            const values = isFilteredByCallRound
                ? [
                      sttCounter,
                      row.projectTitle,
                      row.councilName,
                      row.memberName,
                      row.memberStudentId,
                      row.memberClass,
                      row.memberRole,
                      row.advisorName,
                      row.defenseDate,
                      row.defenseLocation,
                      row.evaluatorName,
                      Number(row.score),
                      row.decision,
                      row.evaluatedAt,
                      row.comment,
                      rankLabel,
                  ]
                : [
                      sttCounter,
                      row.callRoundName,
                      row.projectTitle,
                      row.councilName,
                      row.memberName,
                      row.memberStudentId,
                      row.memberClass,
                      row.memberRole,
                      row.advisorName,
                      row.defenseDate,
                      row.defenseLocation,
                      row.evaluatorName,
                      Number(row.score),
                      row.decision,
                      row.evaluatedAt,
                      row.comment,
                      rankLabel,
                  ];

            const key = `${row.councilName}__${row.projectId}`;
            if (key !== mergeKey) {
                if (mergeStart >= 0 && currentRow - 1 > mergeStart) {
                    mergeKeys.push({ start: mergeStart, end: currentRow - 1, key: mergeKey });
                }
                mergeKey = key;
                mergeStart = currentRow;
                altIdx += 1;
            }

            const altRow = altIdx % 2 === 1;
            values.forEach((v, i) => {
                const cell = excelRow.getCell(i + 1);
                cell.value = v;
                styleDataCell(cell, i, centerCols, altRow);
            });
            excelRow.height = 25;
            currentRow += 1;
        });

        if (mergeStart >= 0 && currentRow - 1 > mergeStart) {
            mergeKeys.push({ start: mergeStart, end: currentRow - 1, key: mergeKey });
        }

        // Apply merges
        mergeKeys.forEach(({ start, end, key: _key }) => {
            for (const col of mergeColumns) {
                ws.mergeCells(start, col + 1, end, col + 1);
            }
        });

        const buffer = await workbook.xlsx.writeBuffer();
        const fileName = callRoundId
            ? `dean-council-evaluations-styled-${callRoundId}-${timeStamp}.xlsx`
            : `dean-council-evaluations-styled-all-${timeStamp}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting styled dean council evaluations:', error);
        return NextResponse.json({ success: false, error: 'Failed to export council evaluations' }, { status: 500 });
    }
}
