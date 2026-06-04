import {
  ApplicableFor,
  CallRoundApprovalStatus,
  FacultyStatus,
  Gender,
  InstructorStatus,
  InvitationStatus,
  ProjectClosingStatus,
  ProjectStatus,
  RegistrationStatus,
  ReviewDecision,
  Role,
} from './generated/prisma';
import prisma from '../lib/prisma';

const randInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T | undefined => (arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined);
const pickN = <T>(arr: T[], n: number) => [...arr].sort(() => Math.random() - 0.5).slice(0, Math.min(n, arr.length));

async function clearDatabase() {
  await prisma.officeMeetingView.deleteMany();
  await prisma.officeMeeting.deleteMany();
  await prisma.callRoundAttachment.deleteMany();
  await prisma.projectCouncilAssignment.deleteMany();
  await prisma.councilMemberAssignment.deleteMany();
  await prisma.council.deleteMany();
  await prisma.callRoundCouncilMember.deleteMany();
  await prisma.callRoundInstructor.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.post.deleteMany();
  await prisma.projectClosingSubmission.deleteMany();
  await prisma.progressReport.deleteMany();
  await prisma.progressReportTemplateItem.deleteMany();
  await prisma.progressReportTemplate.deleteMany();
  await prisma.councilEvaluation.deleteMany();
  await prisma.fundingDisbursement.deleteMany();
  await prisma.extensionRequest.deleteMany();
  await prisma.projectRegistration.deleteMany();
  await prisma.project.deleteMany();
  await prisma.projectType.deleteMany();
  await prisma.callRound.deleteMany();
  await prisma.reportJob.deleteMany();
  await prisma.reportTemplate.deleteMany();
  await prisma.autoApprovalJob.deleteMany();
  await prisma.lecturerPublication.deleteMany();
  await prisma.lecturer.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.major.deleteMany();
  await prisma.department.deleteMany();
}

async function seedOrg() {
  const deptSeeds = [
    { code: 'IT', name: 'Khoa Công nghệ thông tin' },
    { code: 'BUS', name: 'Khoa Kinh tế' },
    { code: 'ENG', name: 'Khoa Kỹ thuật' },
    { code: 'SCI', name: 'Khoa Khoa học tự nhiên' },
    { code: 'LAN', name: 'Khoa Ngoại ngữ' },
  ];

  const majorMap: Record<string, string[]> = {
    IT: ['AI', 'SE', 'DE', 'IOT'],
    BUS: ['BA', 'ACC', 'MKT'],
    ENG: ['ME', 'EE', 'AUTO'],
    SCI: ['MATH', 'PHY', 'CHEM'],
    LAN: ['ENG_L', 'JAP', 'CHI'],
  };

  const departments = [] as any[];
  const majors = [] as any[];
  const classes = [] as any[];

  for (const d of deptSeeds) {
    const dept = await prisma.department.create({ data: { code: d.code, name: d.name } });
    departments.push(dept);

    for (const mCode of majorMap[d.code]) {
      const major = await prisma.major.create({
        data: {
          code: `${mCode}_${d.code}`.slice(0, 20),
          name: `Ngành ${mCode}`,
          departmentId: dept.id,
        },
      });
      majors.push(major);

      const classCount = 3;
      for (let i = 1; i <= classCount; i++) {
        const cls = await prisma.class.create({
          data: {
            code: `${mCode}${d.code}${String(i).padStart(2, '0')}`.slice(0, 20),
            name: `Lớp ${mCode} ${i}`,
            majorId: major.id,
          },
        });
        classes.push(cls);
      }
    }
  }

  return { departments, majors, classes };
}

async function seedUsers(org: { departments: any[]; majors: any[]; classes: any[] }) {
  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];
  const middles = ['Văn', 'Thị', 'Hữu', 'Minh', 'Thanh', 'Đức', 'Quốc', 'Anh'];
  const lasts = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Kiên', 'Linh', 'Nam', 'Phương', 'Sơn'];

  const admin = await prisma.user.create({
    data: { email: 'admin@university.edu', password: '123456', name: 'Admin', role: Role.ADMIN, code: 'ADMIN001' },
  });

  const deans: any[] = [];
  const lecturers: any[] = [];
  const councils: any[] = [];
  const students: any[] = [];
  let gSeq = 1;
  let sSeq = 1;

  for (const dept of org.departments) {
    const deptMajors = org.majors.filter((m) => m.departmentId === dept.id);
    const deptClasses = org.classes.filter((c) => deptMajors.some((m) => m.id === c.majorId));

    const dean = await prisma.user.create({
      data: {
        email: `dean.${dept.code.toLowerCase()}@university.edu`,
        password: '123456',
        name: `Trưởng khoa ${dept.name}`,
        role: Role.DEAN,
        code: `DEAN_${dept.code}`,
        departmentId: dept.id,
        majorId: deptMajors[0]?.id,
      },
    });
    deans.push(dean);

    const lecturerCount = randInt(40, 60);
    for (let i = 0; i < lecturerCount; i++) {
      const major = pick(deptMajors);
      const u = await prisma.user.create({
        data: {
          email: `gv${String(gSeq).padStart(5, '0')}@university.edu`,
          password: '123456',
          name: `${pick(firstNames)} ${pick(middles)} ${pick(lasts)}`,
          role: Role.LECTURER,
          code: `GV${String(gSeq).padStart(5, '0')}`,
          departmentId: dept.id,
          majorId: major.id,
          gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        },
      });
      lecturers.push(u);
      gSeq++;
    }

    const councilCount = randInt(12, 20);
    for (let i = 0; i < councilCount; i++) {
      const major = pick(deptMajors);
      const u = await prisma.user.create({
        data: {
          email: `hd${dept.code.toLowerCase()}${String(i + 1).padStart(3, '0')}@university.edu`,
          password: '123456',
          name: `${pick(firstNames)} ${pick(middles)} ${pick(lasts)}`,
          role: Role.COUNCIL,
          code: `HD${dept.code}${String(i + 1).padStart(3, '0')}`,
          departmentId: dept.id,
          majorId: major.id,
        },
      });
      councils.push(u);
    }

    const studentCount = randInt(200, 300);
    for (let i = 0; i < studentCount; i++) {
      const cls = pick(deptClasses);
      const major = deptMajors.find((m) => m.id === cls.majorId)!;
      const u = await prisma.user.create({
        data: {
          email: `sv${String(sSeq).padStart(6, '0')}@university.edu`,
          password: '123456',
          name: `${pick(firstNames)} ${pick(middles)} ${pick(lasts)}`,
          role: Role.STUDENT,
          code: `SV${String(sSeq).padStart(6, '0')}`,
          departmentId: dept.id,
          majorId: major.id,
          classId: cls.id,
          gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        },
      });
      students.push(u);
      sSeq++;
    }
  }

  return { admin, deans, lecturers, councils, students };
}

async function seedFlow(org: any, users: any) {
  await prisma.projectType.createMany({ data: [{ name: 'Đề tài sinh viên' }, { name: 'Đề tài giảng viên' }] });
  const projectType = await prisma.projectType.findFirst({ where: { name: 'Đề tài sinh viên' } });

  for (const dept of org.departments) {
    const dean = users.deans.find((d: any) => d.departmentId === dept.id);
    const deptStudents = users.students.filter((s: any) => s.departmentId === dept.id);
    const deptLecturers = users.lecturers.filter((l: any) => l.departmentId === dept.id);
    const deptCouncils = users.councils.filter((c: any) => c.departmentId === dept.id);
    const deptMajors = org.majors.filter((m: any) => m.departmentId === dept.id);

    const roundCount = randInt(3, 4);
    for (let r = 1; r <= roundCount; r++) {
      const start = new Date(2026, randInt(0, 7), randInt(1, 15));
      const end = new Date(start.getTime() + 15 * 86400000);
      const pStart = new Date(end.getTime() + 2 * 86400000);
      const pEnd = new Date(pStart.getTime() + 90 * 86400000);

      const callRound = await prisma.callRound.create({
        data: {
          name: `Đợt NCKH ${dept.code}-${r}`,
          description: `Seed full flow ${dept.name}`,
          registrationStartDate: start,
          registrationEndDate: end,
          projectStartDate: pStart,
          projectEndDate: pEnd,
          reviewDeadline: new Date(end.getTime() + 5 * 86400000),
          reportingStartDate: new Date(pStart.getTime() + 30 * 86400000),
          defenseDate: new Date(pEnd.getTime() + 7 * 86400000),
          projectLockDate: end,
          startDate: start,
          endDate: end,
          applicableFor: ApplicableFor.STUDENT,
          approvalStatus: CallRoundApprovalStatus.APPROVED,
          createdById: dean.id,
          createdByRole: Role.DEAN,
          approvedById: users.admin.id,
          approvedAt: new Date(),
          departments: { connect: [{ id: dept.id }] },
          majors: { connect: deptMajors.map((m: any) => ({ id: m.id })) },
        },
      });

      const invitedInstructors = pickN(deptLecturers, randInt(20, Math.min(35, deptLecturers.length)));
      await prisma.callRoundInstructor.createMany({
        data: invitedInstructors.map((i: any) => ({
          callRoundId: callRound.id,
          instructorId: i.id,
          invitationStatus: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        })),
      });

      const invitedCouncilPool = pickN(deptCouncils, randInt(9, Math.min(15, deptCouncils.length)));
      await prisma.callRoundCouncilMember.createMany({
        data: invitedCouncilPool.map((i: any) => ({
          callRoundId: callRound.id,
          councilMemberId: i.id,
          invitationStatus: InvitationStatus.ACCEPTED,
          respondedAt: new Date(),
        })),
      });

      const regsPerRound = randInt(25, 40);
      const registrations: any[] = [];
      const usedLeaderIds = new Set<string>();

      for (let i = 0; i < regsPerRound; i++) {
        const leader = pick<any>(deptStudents.filter((s: any) => !usedLeaderIds.has(s.id)));
        if (!leader) break;
        usedLeaderIds.add(leader.id);

        const teamSize = randInt(2, 5);
        const mates = pickN(deptStudents.filter((s: any) => s.id !== leader.id), teamSize - 1);
        const instructor = pick<any>(invitedInstructors);
        if (!instructor) continue;

        const reg = await prisma.projectRegistration.create({
          data: {
            userId: leader.id,
            callRoundId: callRound.id,
            title: `Đề tài ${dept.code}-${r}-${String(i + 1).padStart(3, '0')}`,
            objective: 'Mục tiêu nghiên cứu mô phỏng dữ liệu thật.',
            expectedOutput: 'Báo cáo + sản phẩm mẫu.',
            teamMembers: mates.map((m: any) => ({ id: m.id, name: m.name, code: m.code })),
            status: RegistrationStatus.APPROVED,
            instructorId: instructor.id,
            instructorStatus: InstructorStatus.ACCEPTED,
            facultyStatus: FacultyStatus.APPROVED,
            facultyReviewerId: dean.id,
          },
        });
        registrations.push(reg);

        const project = await prisma.project.create({
          data: {
            code: `PRJ-${dept.code}-${r}-${String(i + 1).padStart(3, '0')}`,
            title: reg.title,
            objective: reg.objective,
            expectedOutput: reg.expectedOutput,
            status: ProjectStatus.COMPLETED,
            leaderId: leader.id,
            deanReviewerId: dean.id,
            callRoundId: callRound.id,
            projectTypeId: projectType?.id,
            instructorId: instructor.id,
            budgetRequested: randInt(10000000, 30000000),
            budgetApproved: randInt(8000000, 25000000),
          },
        });

        await prisma.projectClosingSubmission.create({
          data: {
            projectId: project.id,
            submittedById: leader.id,
            status: ProjectClosingStatus.APPROVED,
            note: 'Nghiệm thu đạt',
            reportFiles: [{ name: 'bao-cao.pdf', url: '/seed/reports/bao-cao.pdf' }],
            presentationSlideFiles: [{ name: 'slide.pptx', url: '/seed/slides/slide.pptx' }],
          },
        });

        const disbursementAmount = randInt(1000000, 5000000);
        const disbursedAt = new Date(pStart.getTime() + randInt(5, 45) * 86400000);
        const dStatusPick = randInt(1, 100);
        const dStatus = dStatusPick <= 60 ? 'APPROVED' : dStatusPick <= 85 ? 'PENDING' : 'REJECTED';

        await prisma.fundingDisbursement.create({
          data: {
            projectId: project.id,
            amount: disbursementAmount,
            disbursedAt,
            voucherNo: `VC-${dept.code}-${r}-${String(i + 1).padStart(3, '0')}`,
            reason: 'Giải ngân theo tiến độ thực hiện đề tài.',
            status: dStatus as any,
            createdById: dean.id,
            approvedById: dStatus === 'APPROVED' ? users.admin.id : null,
            approvedAt: dStatus === 'APPROVED' ? new Date(disbursedAt.getTime() + 86400000) : null,
            rejectionNote: dStatus === 'REJECTED' ? 'Hồ sơ chứng từ chưa hợp lệ.' : null,
          },
        });
      }

      const councilCount = randInt(2, 3);
      const councils: any[] = [];
      for (let c = 1; c <= councilCount; c++) {
        const council = await prisma.council.create({
          data: {
            callRoundId: callRound.id,
            name: `Hội đồng ${dept.code}-${r}-${c}`,
            defenseDate: new Date(pEnd.getTime() + c * 86400000),
            defenseLocation: `Phòng A${100 + c}`,
          },
        });
        councils.push(council);

        const members = pickN(invitedCouncilPool, randInt(3, 5));
        const roles = ['Chủ tịch', 'Thư ký', 'Ủy viên 1', 'Ủy viên 2', 'Ủy viên 3'];
        await prisma.councilMemberAssignment.createMany({
          data: members.map((m: any, idx: number) => ({ councilId: council.id, councilMemberId: m.id, role: roles[idx] })),
        });
      }

      for (let i = 0; i < registrations.length; i++) {
        const reg = registrations[i];
        const council = councils[i % councils.length];
        await prisma.projectCouncilAssignment.create({
          data: { councilId: council.id, projectRegistrationId: reg.id },
        });

        const project = await prisma.project.findFirst({ where: { title: reg.title, callRoundId: callRound.id } });
        if (!project) continue;
        const cMembers = await prisma.councilMemberAssignment.findMany({ where: { councilId: council.id } });

        for (const cm of cMembers) {
          const score = randInt(65, 98);
          await prisma.councilEvaluation.create({
            data: {
              projectId: project.id,
              councilMemberId: cm.councilMemberId,
              score,
              decision: score >= 80 ? ReviewDecision.PASS : score >= 70 ? ReviewDecision.NEED_REVISION : ReviewDecision.FAIL,
              comment: 'Đánh giá seed tự động',
            },
          });
        }
      }
    }
  }
}

async function main() {
  console.log('🌱 Seed full NCKH flow...');
  await clearDatabase();
  const org = await seedOrg();
  const users = await seedUsers(org);
  await seedFlow(org, users);
  console.log('✅ Done');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
