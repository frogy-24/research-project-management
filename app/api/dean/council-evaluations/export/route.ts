import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth-helpers';
import { registrationTeamMemberSchema } from '@/types/project-registration.schema';
import * as XLSX from 'xlsx';

const teamMemberArraySchema = registrationTeamMemberSchema.array();

type TeamMember = {
    name: string;
    role: string;
    studentId: string | null;
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
};

type ExportRow = {
    callRoundName: string;
    callRoundRegistrationPeriod: string;
    councilName: string;
    defenseDate: string;
    defenseLocation: string;
    projectTitle: string;
    projectObjective: string;
    projectRegistrationTitle: string;
    projectRegistrationObjective: string;
    projectRegistrationId: string;
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
    PASS: 'Dat',
    NEED_REVISION: 'Can sua doi',
    FAIL: 'Khong dat',
};

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

export async function GET(request: NextRequest) {
    try {
        const session = await getAuthUser();
        if (!session || session.role !== 'DEAN') {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const callRoundId = request.nextUrl.searchParams.get('callRoundId');
        const keyword = request.nextUrl.searchParams.get('search')?.trim().toLowerCase() || '';

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
        if (callRoundIds.length === 0) {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.aoa_to_sheet([
                ['BÁO CÁO KẾT QUẢ CHẤM ĐIỂM HỘI ĐỒNG'],
                ['Không có dữ liệu theo bộ lọc hiện tại.'],
            ]);
            ws['!cols'] = [{ wch: 60 }];
            ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
            XLSX.utils.book_append_sheet(wb, ws, 'Ket qua cham diem');
            const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

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
                                departmentRef: {
                                    select: {
                                        name: true,
                                    },
                                },
                                major: {
                                    select: {
                                        name: true,
                                    },
                                },
                            },
                        },
                        user: {
                            select: {
                                name: true,
                                code: true,
                                email: true,
                                departmentRef: {
                                    select: {
                                        name: true,
                                    },
                                },
                                major: {
                                    select: {
                                        name: true,
                                    },
                                },
                                class: {
                                    select: {
                                        name: true,
                                    },
                                },
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
                    const idPart = member.studentId ? ` [${member.studentId}]` : '';
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
            });
        });

        const registrationIds = Array.from(registrationContextMap.keys());

        const projects = await prisma.project.findMany({
            where: {
                leader: {
                    registrations: {
                        some: {
                            id: {
                                in: registrationIds,
                            },
                        },
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
                            where: {
                                id: {
                                    in: registrationIds,
                                },
                            },
                            select: {
                                id: true,
                            },
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
            where: {
                projectId: {
                    in: projectIds,
                },
            },
            include: {
                councilMember: {
                    select: {
                        name: true,
                        code: true,
                        email: true,
                        departmentRef: {
                            select: {
                                name: true,
                            },
                        },
                        major: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                evaluatedAt: 'desc',
            },
        });

        const exportRows: ExportRow[] = evaluations
            .map((evaluation) => {
                const context = projectContextMap.get(evaluation.projectId);
                if (!context) {
                    return null;
                }

                const periodStart = formatDate(context.callRoundRegistrationStartDate);
                const periodEnd = formatDate(context.callRoundRegistrationEndDate);

                return {
                    callRoundName: context.callRoundName,
                    callRoundRegistrationPeriod: periodStart && periodEnd ? `${periodStart} - ${periodEnd}` : '',
                    councilName: context.councilName,
                    defenseDate: formatDateTime(context.defenseDate),
                    defenseLocation: safeText(context.defenseLocation),
                    projectTitle: context.projectTitle,
                    projectObjective: context.projectObjective,
                    projectRegistrationTitle: context.projectRegistrationTitle,
                    projectRegistrationObjective: context.projectRegistrationObjective,
                    projectRegistrationId: context.projectRegistrationId,
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
                    evaluatorName: safeText(evaluation.councilMember.name),
                    evaluatorCode: safeText(evaluation.councilMember.code),
                    evaluatorEmail: safeText(evaluation.councilMember.email),
                    evaluatorDepartment: safeText(evaluation.councilMember.departmentRef?.name),
                    evaluatorMajor: safeText(evaluation.councilMember.major?.name),
                    score: String(evaluation.score),
                    decision: getDecisionLabel(evaluation.decision),
                    comment: safeText(evaluation.comment),
                    evaluatedAt: formatDateTime(evaluation.evaluatedAt),
                };
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

        const isFilteredByCallRound = Boolean(callRoundId);
        const header = isFilteredByCallRound
            ? ['STT', 'Đề tài', 'Hội đồng', 'Người chấm', 'Điểm', 'Quyết định', 'Thời gian chấm', 'Nhận xét']
            : ['STT', 'Đợt đề tài', 'Đề tài', 'Hội đồng', 'Người chấm', 'Điểm', 'Quyết định', 'Thời gian chấm', 'Nhận xét'];

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

        const emptyRow = () => new Array(header.length).fill('');
        const sheetRows: Array<(string | number)[]> = [];
        let stt = 1;
        let currentCallRound = '';
        let currentCouncil = '';
        let currentProject = '';

        for (const row of sortedRows) {
            if (!isFilteredByCallRound && row.callRoundName !== currentCallRound) {
                if (sheetRows.length > 0) sheetRows.push(emptyRow());
                currentCallRound = row.callRoundName;
                currentCouncil = '';
                currentProject = '';
                const groupRow = emptyRow();
                groupRow[1] = `ĐỢT ĐỀ TÀI: ${row.callRoundName}`;
                sheetRows.push(groupRow);
            }

            if (row.councilName !== currentCouncil) {
                if (sheetRows.length > 0) sheetRows.push(emptyRow());
                currentCouncil = row.councilName;
                currentProject = '';
                const councilCol = isFilteredByCallRound ? 2 : 3;
                const groupRow = emptyRow();
                groupRow[councilCol] = `HỘI ĐỒNG: ${row.councilName}`;
                sheetRows.push(groupRow);
            }

            if (row.projectTitle !== currentProject) {
                currentProject = row.projectTitle;
                const projectCol = isFilteredByCallRound ? 1 : 2;
                const groupRow = emptyRow();
                groupRow[projectCol] = `ĐỀ TÀI: ${row.projectTitle}`;
                sheetRows.push(groupRow);
            }

            sheetRows.push(
                isFilteredByCallRound
                    ? [
                          stt++,
                          row.projectTitle,
                          row.councilName,
                          row.evaluatorName,
                          Number(row.score),
                          row.decision,
                          row.evaluatedAt,
                          row.comment,
                      ]
                    : [
                          stt++,
                          row.callRoundName,
                          row.projectTitle,
                          row.councilName,
                          row.evaluatorName,
                          Number(row.score),
                          row.decision,
                          row.evaluatedAt,
                          row.comment,
                      ],
            );
        }

        const wb = XLSX.utils.book_new();
        const title = 'BÁO CÁO KẾT QUẢ CHẤM ĐIỂM HỘI ĐỒNG';
        const filterLabel = callRoundId ? `Bộ lọc đợt đề tài: ${callRounds.find((r) => r.id === callRoundId)?.name || callRoundId}` : 'Bộ lọc đợt đề tài: Tất cả';
        const wsData = [[title], [filterLabel], [], header, ...sheetRows];
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = isFilteredByCallRound
            ? [{ wch: 6 }, { wch: 40 }, { wch: 24 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 20 }, { wch: 52 }]
            : [{ wch: 6 }, { wch: 24 }, { wch: 40 }, { wch: 24 }, { wch: 24 }, { wch: 10 }, { wch: 16 }, { wch: 20 }, { wch: 48 }];
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: header.length - 1 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: header.length - 1 } },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Ket qua cham diem');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        const now = new Date();
        const timeStamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const fileName = callRoundId
            ? `dean-council-evaluations-${callRoundId}-${timeStamp}.xlsx`
            : `dean-council-evaluations-all-${timeStamp}.xlsx`;

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (error) {
        console.error('Error exporting dean council evaluations:', error);
        return NextResponse.json({ success: false, error: 'Failed to export council evaluations' }, { status: 500 });
    }
}
