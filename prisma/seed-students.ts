import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

import { Gender, Role } from './generated/prisma';
import prisma from '../lib/prisma';

// Danh sách sinh viên cần thêm (Mã SV làm key, có thể trùng → sẽ dedupe)
const RAW_STUDENTS: Array<{ name: string; code: string }> = [
  { name: 'Phan Mạnh Cường', code: '10122069' },
  { name: 'Dương Trịnh Hoài An', code: '12422001' },
  { name: 'Cao Chí Hải', code: '12422006' },
  { name: 'Nguyễn Doãn Hiếu', code: '12421038' },
  { name: 'Lê Dương Hiếu', code: '12423011' },
  { name: 'Hoàng Hải Đăng', code: '12423009' },
  { name: 'Phạm Đình Phúc', code: '12423063' },
  { name: 'Phạm Thị Linh Chi', code: '12423005' },
  { name: 'Vũ Đăng Khiêm', code: '12423017' },
  { name: 'Trần Tuấn Anh', code: '12423002' },
  { name: 'Lê Ngọc Khánh', code: '12423016' },
  { name: 'Vũ Huy Hoàng', code: '12423073' },
  { name: 'Phạm Văn Kiên', code: '12423047' },
  { name: 'Nguyễn Phương Linh', code: '12522057' },
  { name: 'Cao Đình Lương', code: '12522064' },
  { name: 'Nguyễn Tiến Đạt', code: '10122119' },
  { name: 'Nguyễn Trung Kiên', code: '10122222' },
  { name: 'Lương Việt Tiến', code: '12523083' },
  { name: 'Đỗ Hữu Quốc Ánh', code: '10123028' },
  { name: 'Đỗ Tiến Đạt', code: '10123084' },
  { name: 'Lê Huy Hoàng', code: '10123139' },
  { name: 'Đỗ Hữu Quốc Anh', code: '10123006' },
  { name: 'Nguyễn Minh Vương', code: '10123369' },
  { name: 'Lưu Văn Đức Anh', code: '12523001' },
  { name: 'Ngô Thị Minh Quang', code: '12523068' },
  { name: 'Đào Thị Thanh', code: '10123293' },
  { name: 'Bùi Kim Trại', code: '12523086' },
  { name: 'Hà Thành Đạt', code: '12523021' },
  { name: 'Nguyễn Văn Đức', code: '10123102' },
  { name: 'Nguyễn Thế Phong', code: '12523101' },
  { name: 'Trần Thị Minh Ánh', code: '10122034' },
  { name: 'Nguyễn Hữu Bảo', code: '10122046' },
  { name: 'Trần Hải Anh', code: '10122043' },
  { name: 'Luyện Thị Vân Anh', code: '10922005' },
  { name: 'Hoàng Văn Quí', code: '10122307' },
  { name: 'Đặng Thị Hồng Thắm', code: '10122332' },
  { name: 'Bùi Quốc Thắng', code: '10122333' },
  { name: 'Phạm Hoàng Kim Yến', code: '10122423' },
  { name: 'Nguyễn Ngọc Quyền', code: '10123275' },
  { name: 'Lê Lại Linh Đan', code: '10123079' },
  { name: 'Nguyễn Thành Long', code: '10124214' },
  { name: 'Đặng Tiến Trường', code: '10123334' },
  { name: 'Nguyễn Thị Như Quỳnh', code: '12523072' },
  { name: 'Nguyễn Minh Dương', code: '10123065' },
  { name: 'Nguyễn Minh Hiếu', code: '12423049' },
  { name: 'Đỗ Đức Thịnh', code: '10123307' },
  { name: 'Đinh Thị Huyền', code: '10122202' },
  { name: 'Phạm Xuân Chuẩn', code: '10123045' },
  { name: 'Ninh Viết Tùng', code: '10123351' },
  { name: 'Thân Tiến Đạt', code: '1253109' },
  { name: 'Đỗ Thanh Huyền', code: '10724038' },
  { name: 'Nguyễn Đỗ Khải Hoàn', code: '12423012' },
  { name: 'Lưu Hoàng Minh', code: '12423023' },
  { name: 'Nguyễn Xuân Mong', code: '12423024' },
  { name: 'Nguyễn Văn Đạt', code: '12423061' },
  { name: 'Lê Trí Tùng', code: '12423037' },
  { name: 'Nguyễn Quốc Bảo', code: '10123033' },
  { name: 'Đỗ Thanh Tùng', code: '10122393' },
  { name: 'Nguyễn Văn Hiếu', code: '10122169' },
  { name: 'Hoàng Kiều Ngân', code: '12522072' },
  { name: 'Đỗ Văn Linh', code: '12423040' },
  { name: 'Lê Quang Trung', code: '12423036' },
  { name: 'Trần Tân Khả', code: '12522044' },
  { name: 'Nguyễn Văn Khang', code: '12522046' },
  { name: 'Nguyễn Thị Mai Chi', code: '10123039' },
  { name: 'Nhữ Bảo Anh', code: '10122029' },
];

const DEPARTMENT_CODE = 'IT'; // Khoa Công nghệ thông tin
const DEFAULT_PASSWORD = '123456';
const PREFIX_LEN = 5; // 5 ký tự đầu của mã SV = prefix lớp

// Đoán giới tính đơn giản theo tên (chỉ dùng cho trường gender, có thể OVERRIDE nếu muốn)
const guessGender = (name: string): Gender => {
  const females = [
    'Linh', 'Chi', 'Anh', 'Quỳnh', 'Thanh', 'Huyền', 'Thắm', 'Yến', 'Ánh', 'Ngân', 'Phương',
    'Vân', 'Đan', 'Hồng', 'Mai',
  ];
  const tokens = name.split(/\s+/);
  for (const t of tokens) {
    if (females.includes(t)) return Gender.FEMALE;
  }
  return Gender.MALE;
};

/**
 * Tìm lớp theo quy tắc: 5 ký tự đầu mã SV trùng 5 ký tự đầu mã lớp.
 * Nếu có nhiều lớp match → ưu tiên lớp có mã dài hơn (cụ thể hơn),
 * tie-break theo thứ tự alphabet.
 * Trả về null nếu không tìm thấy.
 */
function findClassByStudentCode(
  classes: { id: string; code: string; majorId: string }[],
  studentCode: string,
) {
  if (studentCode.length < PREFIX_LEN) return null;
  const prefix = studentCode.slice(0, PREFIX_LEN);
  const matches = classes.filter((c) => c.code.startsWith(prefix));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    if (b.code.length !== a.code.length) return b.code.length - a.code.length;
    return a.code.localeCompare(b.code);
  });
  return matches[0];
}

async function main() {
  console.log('🌱 Seeding students theo rule 5-ký-tự-đầu → lớp...\n');

  // 1. Tìm khoa CNTT
  const department = await prisma.department.findUnique({ where: { code: DEPARTMENT_CODE } });
  if (!department) {
    throw new Error(`❌ Không tìm thấy khoa với code="${DEPARTMENT_CODE}". Hãy chạy seed-org trước.`);
  }
  console.log(`✅ Tìm thấy khoa: ${department.name} (${department.code})`);

  // 2. Lấy tất cả ngành thuộc khoa CNTT
  const majors = await prisma.major.findMany({ where: { departmentId: department.id } });
  if (majors.length === 0) {
    throw new Error(`❌ Khoa ${department.code} chưa có ngành nào. Hãy seed majors trước.`);
  }
  console.log(`✅ Tìm thấy ${majors.length} ngành thuộc khoa ${department.code}`);

  // 3. Lấy tất cả lớp thuộc các ngành của khoa CNTT
  const classes = await prisma.class.findMany({
    where: { majorId: { in: majors.map((m) => m.id) } },
    select: { id: true, code: true, majorId: true },
  });
  if (classes.length === 0) {
    throw new Error(`❌ Khoa ${department.code} chưa có lớp nào. Hãy seed classes trước.`);
  }
  console.log(`✅ Tìm thấy ${classes.length} lớp thuộc khoa ${department.code}\n`);

  // 4. Dedupe theo code (giữ entry cuối cùng)
  const dedupMap = new Map<string, { name: string; code: string }>();
  for (const s of RAW_STUDENTS) {
    dedupMap.set(s.code, s);
  }
  const students = Array.from(dedupMap.values());
  console.log(`📋 Tổng sinh viên (sau dedupe): ${students.length} (raw: ${RAW_STUDENTS.length})\n`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const s of students) {
    const cls = findClassByStudentCode(classes, s.code);
    if (!cls) {
      skipped++;
      console.log(`  ⏭  ${s.code} ${s.name} → bỏ qua (prefix "${s.code.slice(0, PREFIX_LEN)}" không khớp lớp nào)`);
      continue;
    }
    const major = majors.find((m) => m.id === cls.majorId)!;

    const existing = await prisma.user.findUnique({ where: { code: s.code } });

    if (existing) {
      // Đã tồn tại → cập nhật khoa/ngành/lớp + role (không ghi đè name/email)
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: Role.STUDENT,
          departmentId: department.id,
          majorId: major.id,
          classId: cls.id,
        },
      });
      updated++;
      console.log(`  ↻ ${s.code} ${s.name} → ${major.code} / ${cls.code}`);
    } else {
      await prisma.user.create({
        data: {
          code: s.code,
          name: s.name,
          email: `${s.code}@student.university.edu`,
          password: DEFAULT_PASSWORD,
          role: Role.STUDENT,
          departmentId: department.id,
          majorId: major.id,
          classId: cls.id,
          gender: guessGender(s.name),
        },
      });
      created++;
      console.log(`  ✓ ${s.code} ${s.name} → ${major.code} / ${cls.code}`);
    }
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`   • Tổng:           ${students.length}`);
  console.log(`   • Tạo mới:        ${created}`);
  console.log(`   • Cập nhật:       ${updated}`);
  console.log(`   • Bỏ qua:         ${skipped}`);
  console.log('\n🎉 Seed students hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
