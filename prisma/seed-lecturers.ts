import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

import {
  AcademicRank,
  Gender,
  LecturerEmploymentType,
  LecturerWorkingStatus,
  Role,
} from './generated/prisma';
import prisma from '../lib/prisma';

// Danh sách giảng viên cần thêm (name + học hàm/học vị). Có thể trùng → sẽ dedupe theo (name, title).
type Title = 'PGS.TS' | 'TS' | 'ThS' | 'CN' | 'KS';

const RAW_LECTURERS: Array<{ name: string; title: Title }> = [
  { name: 'Nguyễn Minh Tiến', title: 'PGS.TS' },
  { name: 'Nguyễn Thị Ngọc Phượng', title: 'KS' },
  { name: 'Bùi Đức Thọ', title: 'ThS' },
  { name: 'Ngô Thanh Huyền', title: 'ThS' },
  { name: 'Nguyễn Hữu Đông', title: 'ThS' },
  { name: 'Trần Thị Phương', title: 'ThS' },
  { name: 'Trần Đỗ Thu Hà', title: 'ThS' },
  { name: 'Nguyễn Hoàng Điệp', title: 'ThS' },
  { name: 'Đỗ Thị Đào', title: 'ThS' },
  { name: 'Vũ Thị Kim Ngân', title: 'ThS' },
  { name: 'Quách Thị Hương Giang', title: 'ThS' },
  { name: 'Phạm Quốc Hùng', title: 'ThS' },
  { name: 'Phạm Thị Hà Linh', title: 'CN' },
  { name: 'Trịnh Thị Nhị', title: 'ThS' },
  { name: 'Bùi Thị Hồng Hạnh', title: 'KS' },
  { name: 'Vũ Xuân Thắng', title: 'ThS' },
  { name: 'Nguyễn Văn Quyết', title: 'TS' },
  // Trùng để test dedupe
  { name: 'Nguyễn Thị Ngọc Phượng', title: 'KS' },
  { name: 'Trần Thị Phương', title: 'ThS' },
];

const DEPARTMENT_CODE = 'IT'; // Khoa Công nghệ thông tin
const DEFAULT_PASSWORD = '123456';

const titleToRank: Record<Title, AcademicRank> = {
  'PGS.TS': AcademicRank.ASSOCIATE_PROFESSOR,
  TS: AcademicRank.DOCTOR,
  ThS: AcademicRank.MASTER,
  CN: AcademicRank.BACHELOR,
  KS: AcademicRank.BACHELOR,
};

const titleToPosition: Record<Title, string> = {
  'PGS.TS': 'PHONG_GIAO_SU',
  TS: 'GIANG_VIEN_CHINH',
  ThS: 'GIANG_VIEN',
  CN: 'GIANG_VIEN',
  KS: 'GIANG_VIEN',
};

// Đoán giới tính đơn giản theo tên
const guessGender = (name: string): Gender => {
  const females = [
    'Phượng', 'Huyền', 'Phương', 'Hà', 'Điệp', 'Đào', 'Ngân',
    'Giang', 'Linh', 'Nhị', 'Hạnh',
  ];
  const tokens = name.split(/\s+/);
  for (const t of tokens) {
    if (females.includes(t)) return Gender.FEMALE;
  }
  return Gender.MALE;
};

function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '')
    .toLowerCase();
}

async function main() {
  console.log('🌱 Seeding lecturers khoa CNTT...\n');

  // 1. Tìm khoa CNTT
  const department = await prisma.department.findUnique({ where: { code: DEPARTMENT_CODE } });
  if (!department) {
    throw new Error(
      `❌ Không tìm thấy khoa với code="${DEPARTMENT_CODE}". Hãy chạy seed-org trước.`,
    );
  }
  console.log(`✅ Tìm thấy khoa: ${department.name} (${department.code})`);

  // 2. Lấy tất cả ngành thuộc khoa CNTT (dùng để random pick)
  const majors = await prisma.major.findMany({ where: { departmentId: department.id } });
  if (majors.length === 0) {
    throw new Error(`❌ Khoa ${department.code} chưa có ngành nào. Hãy seed majors trước.`);
  }
  console.log(`✅ Tìm thấy ${majors.length} ngành thuộc khoa ${department.code}\n`);

  // 3. Dedupe theo (name, title)
  const dedupMap = new Map<string, { name: string; title: Title }>();
  for (const l of RAW_LECTURERS) {
    const key = `${l.name}__${l.title}`;
    dedupMap.set(key, l);
  }
  const lecturers = Array.from(dedupMap.values());
  console.log(
    `📋 Tổng giảng viên (sau dedupe): ${lecturers.length} (raw: ${RAW_LECTURERS.length})\n`,
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < lecturers.length; i++) {
    const l = lecturers[i];
    const staffId = `GV${String(i + 1).padStart(3, '0')}`;
    const slug = slugify(l.name);
    const email = `${slug}.${String(i + 1).padStart(3, '0')}@university.edu`;

    const rank = titleToRank[l.title];
    const position = titleToPosition[l.title];
    const major = majors[i % majors.length]; // pick ngẫu nhiên (round-robin)
    const gender = guessGender(l.name);

    // Check đã tồn tại theo staffId (code) chưa
    const existing = await prisma.user.findUnique({ where: { code: staffId } });

    if (existing) {
      // Cập nhật khoa/ngành/role
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          role: Role.LECTURER,
          departmentId: department.id,
          majorId: major.id,
        },
      });
      // Upsert Lecturer profile
      await prisma.lecturer.upsert({
        where: { userId: existing.id },
        create: {
          userId: existing.id,
          staffId,
          academicRank: rank,
          positionTitle: position,
          lecturerType: LecturerEmploymentType.FULL_TIME,
          workingStatus: LecturerWorkingStatus.ACTIVE,
          facultyName: department.name,
          departmentName: department.name,
        },
        update: {
          staffId,
          academicRank: rank,
          positionTitle: position,
          lecturerType: LecturerEmploymentType.FULL_TIME,
          workingStatus: LecturerWorkingStatus.ACTIVE,
          facultyName: department.name,
          departmentName: department.name,
        },
      });
      updated++;
      console.log(`  ↻ ${staffId} ${l.name} (${l.title}) → ${major.code}`);
    } else {
      // Check email trùng
      const dupEmail = await prisma.user.findUnique({ where: { email } });
      if (dupEmail) {
        skipped++;
        console.log(`  ⏭  ${staffId} ${l.name} → bỏ qua (email ${email} đã tồn tại)`);
        continue;
      }

      await prisma.user.create({
        data: {
          code: staffId,
          name: l.name,
          email,
          password: DEFAULT_PASSWORD,
          role: Role.LECTURER,
          departmentId: department.id,
          majorId: major.id,
          gender,
          lecturerProfile: {
            create: {
              staffId,
              academicRank: rank,
              positionTitle: position,
              lecturerType: LecturerEmploymentType.FULL_TIME,
              workingStatus: LecturerWorkingStatus.ACTIVE,
              facultyName: department.name,
              departmentName: department.name,
            },
          },
        },
      });
      created++;
      console.log(`  ✓ ${staffId} ${l.name} (${l.title}) → ${major.code}`);
    }
  }

  console.log(`\n📊 Kết quả:`);
  console.log(`   • Tổng:           ${lecturers.length}`);
  console.log(`   • Tạo mới:        ${created}`);
  console.log(`   • Cập nhật:       ${updated}`);
  console.log(`   • Bỏ qua:         ${skipped}`);
  console.log('\n🎉 Seed lecturers hoàn tất!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
