import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

import {
  FacultyStatus,
  InstructorStatus,
  ProjectStatus,
  RegistrationStatus,
  Role,
} from './generated/prisma';
import prisma from '../lib/prisma';

const CALL_ROUND_ID = 'cmpzpavmg00029zly00mriynd';

type Member = { name: string; code: string; classCode?: string };
type InstructorEntry = { name: string };
type ProjectRow = {
  title: string;
  field: string;
  leader: Member;
  members: Member[];
  instructor: InstructorEntry;
};

// Bảng dữ liệu đề tài (lấy từ danh sách user-paste)
// Lưu ý: cột "GV hướng dẫn" nhiều người → chỉ lấy người ĐẦU TIÊN.
const PROJECTS: ProjectRow[] = [
  {
    title:
      'Tăng cường khả năng suy luận của mô hình ngôn ngữ lớn trong hỗ trợ sức khỏe tâm lý dựa trên Agentic CBT Prompting',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Phan Mạnh Cường', code: '10122069', classCode: '124221' },
    members: [
      { name: 'Dương Trịnh Hoài An', code: '12422001', classCode: '124221' },
      { name: 'Cao Chí Hải', code: '12422006', classCode: '124221' },
      { name: 'Nguyễn Doãn Hiếu', code: '12421038', classCode: '124221' },
    ],
    instructor: { name: 'Nguyễn Minh Tiến' },
  },
  {
    title:
      'Nghiên cứu nhận dạng sai lệch nhận thức với các mô hình ngôn ngữ lớn dựa trên Agentic Prompting',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Dương Trịnh Hoài An', code: '12422001', classCode: '124221' },
    members: [
      { name: 'Cao Chí Hải', code: '12422006', classCode: '124221' },
      { name: 'Phan Mạnh Cường', code: '10122069', classCode: '124221' },
    ],
    instructor: { name: 'Bùi Đức Thọ' },
  },
  {
    title:
      'Ứng dụng Retrieval-Augmented Generation trong chatbot định hướng nghề nghiệp cho sinh viên Công nghệ thông tin',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Lê Dương Hiếu', code: '12423011', classCode: '124231' },
    members: [
      { name: 'Hoàng Hải Đăng', code: '12423009', classCode: '124231' },
      { name: 'Phạm Đình Phúc', code: '12423063', classCode: '124231' },
      { name: 'Phạm Thị Linh Chi', code: '12423005', classCode: '124231' },
      { name: 'Vũ Đăng Khiêm', code: '12423017', classCode: '124231' },
    ],
    instructor: { name: 'Nguyễn Minh Tiến' },
  },
  {
    title:
      'SmartStudy – Hệ thống web ứng dụng AI và chatbot gợi ý lộ trình học tập cá nhân hóa các môn học cho sinh viên Công nghệ thông tin',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Trần Tuấn Anh', code: '12423002', classCode: '124231' },
    members: [
      { name: 'Lê Ngọc Khánh', code: '12423016', classCode: '124231' },
      { name: 'Vũ Huy Hoàng', code: '12423073', classCode: '124231' },
      { name: 'Phạm Văn Kiên', code: '12423047', classCode: '124231' },
      { name: 'Lê Dương Hiếu', code: '12423011', classCode: '124231' },
    ],
    instructor: { name: 'Ngô Thanh Huyền' },
  },
  {
    title:
      'Nghiên cứu và phát triển phần mềm AI cho thanh khoản hợp đồng sản xuất xuất khẩu',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Nguyễn Phương Linh', code: '12522057', classCode: '12522W.2' },
    members: [
      { name: 'Cao Đình Lương', code: '12522064', classCode: '12522W.2' },
      { name: 'Dương Trịnh Hoài An', code: '12422001', classCode: '124221' },
    ],
    instructor: { name: 'Nguyễn Hữu Đông' },
  },
  {
    title:
      'Nghiên cứu giải pháp sinh dữ liệu cho phát triển ứng dụng thị giác máy tính dựa trên học sâu.',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Nguyễn Tiến Đạt', code: '10122119', classCode: '12422TN' },
    members: [{ name: 'Nguyễn Trung Kiên', code: '10122222' }],
    instructor: { name: 'Trần Đỗ Thu Hà' },
  },
  {
    title:
      'Thiết kế và xây dựng website cảnh báo lừa đảo tích hợp chatbot và kiểm chứng tin tức',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Lương Việt Tiến', code: '12523083', classCode: '12523W.4' },
    members: [
      { name: 'Đỗ Hữu Quốc Ánh', code: '10123028', classCode: '12523W.4' },
      { name: 'Đỗ Tiến Đạt', code: '10123084', classCode: '12523W.4' },
      { name: 'Lê Huy Hoàng', code: '10123139', classCode: '12523W.4' },
      { name: 'Đỗ Hữu Quốc Anh', code: '10123006', classCode: '12523W.1' },
    ],
    instructor: { name: 'Trần Thị Phương' },
  },
  {
    title:
      'Xây dựng VNCultureBridge AI- Web giới thiệu và giải thích phong tục văn hoá Việt Nam cho người nước ngoài',
    field: 'Văn hoá và công nghệ',
    leader: { name: 'Nguyễn Minh Vương', code: '10123369', classCode: '12523W.1' },
    members: [
      { name: 'Lưu Văn Đức Anh', code: '12523001', classCode: '12523W.1' },
      { name: 'Ngô Thị Minh Quang', code: '12523068', classCode: '12523W.1' },
      { name: 'Đào Thị Thanh', code: '10123293', classCode: '12523W.1' },
      { name: 'Bùi Kim Trại', code: '12523086', classCode: '12523W.1' },
    ],
    instructor: { name: 'Nguyễn Hoàng Điệp' },
  },
  {
    title:
      'Số hóa quy trình giao và giám sát Tiểu luận/bài tập lớn, đồ án  cho sinh viên Khoa Công nghệ Thông tin',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Hà Thành Đạt', code: '12523021', classCode: '12523W.2' },
    members: [
      { name: 'Nguyễn Văn Đức', code: '10123102', classCode: '12523W.2' },
      { name: 'Nguyễn Thế Phong', code: '12523101', classCode: '12523W.2' },
    ],
    instructor: { name: 'Đỗ Thị Đào' },
  },
  {
    title:
      'Nghiên cứu, ứng dụng trí tuệ nhân tạo trong thiết kế hệ thống nhận diện và truyền thông trên nền tảng số cho Khoa Công nghệ Thông tin',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Trần Thị Minh Ánh', code: '10122034', classCode: '10122G.1' },
    members: [
      { name: 'Nguyễn Hữu Bảo', code: '10122046' },
      { name: 'Trần Hải Anh', code: '10122043' }
    ],
    instructor: { name: 'Vũ Thị Kim Ngân' },
  },
  {
    title:
      'Ứng dụng trí tuệ nhân tạo trong thiết kế bộ nhận diện thương hiệu Gạo mang bản sắc văn hóa đồng quê Việt Nam.',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Hoàng Văn Quí', code: '10122307', classCode: '10122G.1' },
    members: [
      { name: 'Đặng Thị Hồng Thắm', code: '10122332', classCode: '10122G.1' },
      { name: 'Bùi Quốc Thắng', code: '10122333', classCode: '10122G.1' },
    ],
    instructor: { name: 'Vũ Thị Kim Ngân' },
  },
  {
    title:
      'Thiết kế truyện tranh số phục vụ công tác truyền thông và định hướng tân sinh viên tại trường đại học Sư phạm Kỹ thuật Hưng Yên.',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Phạm Hoàng Kim Yến', code: '10122423', classCode: '10122G.3' },
    members: [
      { name: 'Nguyễn Ngọc Quyền', code: '10123275', classCode: '10123G.1' },
      { name: 'Lê Lại Linh Đan', code: '10123079', classCode: '10123G.1' },
      { name: 'Nguyễn Thành Long', code: '10124214', classCode: '10124G.2' },
    ],
    instructor: { name: 'Quách Thị Hương Giang' },
  },
  {
    title: 'Xây dựng hệ thống hỗ trợ quản lý thời gian hiệu quả cho sinh viên đại học',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Đặng Tiến Trường', code: '10123334', classCode: '12523W.2' },
    members: [
      { name: 'Nguyễn Thị Như Quỳnh', code: '12523072' },
      { name: 'Nguyễn Minh Dương', code: '10123065', classCode: '12523W.1' },
    ],
    instructor: { name: 'Trịnh Thị Nhị' },
  },
  {
    title:
      'Xây dựng hệ thống gợi ý cá nhân hoá lộ trình học tập và định hướng nghề nghiệp cho sinh viên khoa Công nghệ thông tin dựa trên đồ thị tri thức (Knowledge Graph)',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Nguyễn Minh Hiếu', code: '12423049', classCode: '124231' },
    members: [{ name: 'Đỗ Đức Thịnh', code: '10123307' }],
    instructor: { name: 'Bùi Thị Hồng Hạnh' },
  },
  {
    title:
      'Phát triển hệ thống kiểm chứng tin giả tiếng Việt trong lĩnh vực Chính trị – Xã hội cho báo chí và người dùng mạng xã hội dựa trên kỹ thuật tiên tiến Deep Learning và mô hình ngôn ngữ lớn (LLMs)',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Phạm Đình Phúc', code: '12423063', classCode: '124231' },
    members: [
      { name: 'Vũ Đăng Khiêm', code: '12423017', classCode: '124231' },
      { name: 'Hoàng Hải Đăng', code: '12423009', classCode: '124231' },
      { name: 'Lê Dương Hiếu', code: '12423011', classCode: '124231' },
      { name: 'Nguyễn Doãn Hiếu', code: '12421038', classCode: '124221' },
    ],
    instructor: { name: 'Bùi Đức Thọ' },
  },
  {
    title:
      'F. A. B – Hệ thống web thời trang ứng dụng trí tuệ nhân tạo phối đồ thông minh.',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Đinh Thị Huyền', code: '10122202', classCode: '12523W.3' },
    members: [
      { name: 'Phạm Xuân Chuẩn', code: '10123045', classCode: '12523W.3' },
      { name: 'Ninh Viết Tùng', code: '10123351', classCode: '12523W.3' },
      { name: 'Thân Tiến Đạt', code: '12523109', classCode: '12523W.3' }
    ],
    instructor: { name: 'Vũ Xuân Thắng' },
  },
  {
    title: 'Xây dựng mô hình phát hiện vật thể bay không người lái',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Nguyễn Đỗ Khải Hoàn', code: '12423012', classCode: '12423TN' },
    members: [
      { name: 'Lưu Hoàng Minh', code: '12423023', classCode: '12423TN' },
      { name: 'Nguyễn Xuân Mong', code: '12423024', classCode: '12423TN' },
      { name: 'Nguyễn Văn Đạt', code: '12423061', classCode: '12423TN' },
    ],
    instructor: { name: 'Trần Đỗ Thu Hà' },
  },
  {
    title: 'Xây dựng hệ thống thu thập và gợi ý việc làm cho sinh viên sử dụng AI và Big Data',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Lê Trí Tùng', code: '12423037', classCode: '12423TN' },
    members: [
      { name: 'Nguyễn Quốc Bảo', code: '10123033', classCode: '12423TN' },
      { name: 'Đỗ Thanh Tùng', code: '10122393', classCode: '12522W4' },
      { name: 'Nguyễn Văn Hiếu', code: '10122169', classCode: '12522W2' },
      { name: 'Hoàng Kiều Ngân', code: '12522072', classCode: '12522T.1' },
    ],
    instructor: { name: 'Nguyễn Văn Quyết' },
  },
  {
    title: 'Xây dựng hệ thống kiểm tra đạo văn đồ án sinh viên sử dụng AI và Big Data',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Đỗ Văn Linh', code: '12423040', classCode: '12423TN' },
    members: [
      { name: 'Lê Quang Trung', code: '12423036', classCode: '12423TN' },
      { name: 'Trần Tân Khả', code: '12522044', classCode: '12522W4.CN' },
      { name: 'Nguyễn Văn Khang', code: '12522046', classCode: '12522W4.CN' },
      { name: 'Nguyễn Thị Mai Chi', code: '10123039', classCode: '12523W1' },
    ],
    instructor: { name: 'Nguyễn Văn Quyết' },
  },
  {
    title: 'Xây dựng phần mềm quản lý gia phả thông minh',
    field: 'Kỹ thuật và công nghệ',
    leader: { name: 'Nhữ Bảo Anh', code: '10122029', classCode: '12522W1.KS' },
    members: [{ name: 'Nguyễn Phương Linh', code: '12522057', classCode: '12522W2.KS' }],
    instructor: { name: 'Nguyễn Hữu Đông' },
  },
];

function norm(s: string): string {
  return s
    .normalize('NFC')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  console.log(`🌱 Seeding projects for callRound = ${CALL_ROUND_ID}\n`);

  // 1. Kiểm tra call round tồn tại
  const callRound = await prisma.callRound.findUnique({
    where: { id: CALL_ROUND_ID },
    include: { departments: true },
  });
  if (!callRound) {
    throw new Error(`❌ Không tìm thấy callRound id=${CALL_ROUND_ID}`);
  }
  console.log(`✅ Call round: ${callRound.name}`);

  // 2. Lấy project type
  const projectType = await prisma.projectType.findFirst({ where: { name: 'Đề tài sinh viên' } });
  if (!projectType) {
    console.log('⚠️  Chưa có projectType "Đề tài sinh viên" — sẽ tự tạo');
  }

  // 3. Tìm trưởng khoa CNTT để gán deanReviewer
  const itDept = callRound.departments.find((d) => d.code === 'IT');
  const dean = itDept
    ? await prisma.user.findFirst({ where: { departmentId: itDept.id, role: Role.DEAN } })
    : null;
  console.log(`✅ Trưởng khoa: ${dean?.name ?? '(không tìm thấy)'}`);

  // 4. Build map sinh viên theo code (unique)
  const studentCodes = new Set<string>();
  for (const p of PROJECTS) {
    studentCodes.add(p.leader.code);
    for (const m of p.members) studentCodes.add(m.code);
  }
  const students = await prisma.user.findMany({
    where: { code: { in: Array.from(studentCodes) } },
    select: { id: true, code: true, name: true, classId: true, departmentId: true },
  });
  const studentByCode = new Map(students.map((s) => [s.code, s]));
  const missingStudents = Array.from(studentCodes).filter((c) => !studentByCode.has(c));
  if (missingStudents.length) {
    throw new Error(`❌ Không tìm thấy sinh viên với mã: ${missingStudents.join(', ')}`);
  }
  console.log(`✅ Tìm thấy ${students.length} sinh viên`);

  // 5. Build map giảng viên theo name
  const instructorNames = Array.from(new Set(PROJECTS.map((p) => norm(p.instructor.name))));
  const lecturers = await prisma.user.findMany({
    where: { name: { in: instructorNames }, role: { in: [Role.LECTURER, Role.DEAN, Role.COUNCIL] } },
    select: { id: true, name: true, role: true },
  });
  const lecturerByName = new Map<string, (typeof lecturers)[number]>();
  for (const l of lecturers) lecturerByName.set(norm(l.name), l);
  const missingInstructors = instructorNames.filter((n) => !lecturerByName.has(n));
  if (missingInstructors.length) {
    throw new Error(`❌ Không tìm thấy giảng viên: ${missingInstructors.join(', ')}`);
  }
  console.log(`✅ Tìm thấy ${lecturers.length} giảng viên hướng dẫn`);

  // 6. Tạo từng project
  let ok = 0;
  let skipped = 0;

  for (let i = 0; i < PROJECTS.length; i++) {
    const p = PROJECTS[i];
    const seq = String(i + 1).padStart(3, '0');
    const projectCode = `NCKH-IT-${seq}`;

    const leader = studentByCode.get(p.leader.code);
    const instructor = lecturerByName.get(norm(p.instructor.name));
    if (!leader || !instructor) {
      console.log(`  ⏭  [${seq}] BỎ QUA: thiếu leader hoặc GVHD`);
      skipped++;
      continue;
    }

    const memberEntries = p.members.map((m) => {
      const u = studentByCode.get(m.code)!;
      return { id: u.id, name: u.name, code: u.code };
    });

    // Kiểm tra trùng project code
    const dup = await prisma.project.findUnique({ where: { code: projectCode } });
    if (dup) {
      console.log(`  ↻ [${seq}] Đã tồn tại ${projectCode} → bỏ qua`);
      skipped++;
      continue;
    }

    const objective = `[Lĩnh vực: ${p.field}]\n\n` +
      `Mục tiêu nghiên cứu: ${p.title}.\n\n` +
      `GVHD chính: ${p.instructor.name}.`;

    // 6a. ProjectRegistration (bản ghi đăng ký)
    const reg = await prisma.projectRegistration.create({
      data: {
        userId: leader.id,
        callRoundId: callRound.id,
        title: p.title,
        objective,
        expectedOutput: 'Báo cáo tổng kết + sản phẩm phần mềm/demo.',
        teamMembers: memberEntries,
        status: RegistrationStatus.APPROVED,
        instructorId: instructor.id,
        instructorStatus: InstructorStatus.ACCEPTED,
        facultyStatus: FacultyStatus.APPROVED,
        facultyReviewerId: dean?.id,
      },
    });

    // 6b. Project (đề tài đã được duyệt, đang thực hiện)
    const project = await prisma.project.create({
      data: {
        code: projectCode,
        title: p.title,
        objective,
        expectedOutput: 'Báo cáo tổng kết + sản phẩm phần mềm/demo.',
        status: ProjectStatus.DEAN_APPROVED,
        leaderId: leader.id,
        deanReviewerId: dean?.id,
        callRoundId: callRound.id,
        projectTypeId: projectType?.id,
        instructorId: instructor.id,
        budgetRequested: 15000000,
        budgetApproved: 12000000,
      },
    });

    ok++;
    console.log(`  ✓ [${seq}] ${projectCode} — "${p.title.slice(0, 60)}..."`);
    console.log(
      `      Leader: ${leader.name} (${leader.code}) | GVHD: ${instructor.name} | Thành viên: ${memberEntries.length} | reg=${reg.id.slice(0, 8)}… project=${project.id.slice(0, 8)}…`,
    );
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`   • Tổng:        ${PROJECTS.length}`);
  console.log(`   • Tạo mới:     ${ok}`);
  console.log(`   • Bỏ qua:      ${skipped}`);
  console.log('\n🎉 Seed projects cho call round hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
