import { Role, ProjectStatus, Gender } from './generated/prisma';
import prisma from '../lib/prisma';
import { seedTemplates } from './seed-templates';

/**
 * Xóa toàn bộ dữ liệu trong database
 * Thứ tự xóa phải tuân theo foreign key constraints
 */
async function clearDatabase() {
  console.log('🗑️  Clearing database...\n');

  // Xóa theo thứ tự ngược với foreign key dependencies
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
  await prisma.user.deleteMany();
  await prisma.class.deleteMany();
  await prisma.major.deleteMany();
  await prisma.department.deleteMany();

  console.log('✅ Database cleared successfully!\n');
}

/**
 * Seed Organization data - 5 khoa
 */
async function seedOrganization() {
  console.log('🏢 Seeding Organization data (5 Departments)...');

  // Tạo 5 khoa
  const departments = await Promise.all([
    prisma.department.create({
      data: {
        code: 'IT',
        name: 'Khoa Công nghệ thông tin',
        description: 'Khoa đào tạo về CNTT, Phần mềm, Mạng máy tính',
      },
    }),
    prisma.department.create({
      data: {
        code: 'BUS',
        name: 'Khoa Kinh tế',
        description: 'Khoa đào tạo về Quản trị kinh doanh, Kế toán',
      },
    }),
    prisma.department.create({
      data: {
        code: 'ENG',
        name: 'Khoa Kỹ thuật',
        description: 'Khoa đào tạo về Cơ khí, Điện, Tự động hóa',
      },
    }),
    prisma.department.create({
      data: {
        code: 'SCI',
        name: 'Khoa Khoa học tự nhiên',
        description: 'Khoa đào tạo về Toán, Lý, Hóa',
      },
    }),
    prisma.department.create({
      data: {
        code: 'LAN',
        name: 'Khoa Ngoại ngữ',
        description: 'Khoa đào tạo về Tiếng Anh, Tiếng Nhật, Tiếng Trung',
      },
    }),
  ]);

  console.log(`✅ Created ${departments.length} departments`);

  // Tạo ngành cho mỗi khoa
  const majors = [];
  
  // Khoa CNTT - 3 ngành
  majors.push(
    await prisma.major.create({
      data: { code: 'SE', name: 'Kỹ thuật phần mềm', departmentId: departments[0].id },
    }),
    await prisma.major.create({
      data: { code: 'NET', name: 'Mạng máy tính và truyền thông', departmentId: departments[0].id },
    }),
    await prisma.major.create({
      data: { code: 'AI', name: 'Trí tuệ nhân tạo', departmentId: departments[0].id },
    })
  );

  // Khoa Kinh tế - 2 ngành
  majors.push(
    await prisma.major.create({
      data: { code: 'BA', name: 'Quản trị kinh doanh', departmentId: departments[1].id },
    }),
    await prisma.major.create({
      data: { code: 'ACC', name: 'Kế toán', departmentId: departments[1].id },
    })
  );

  // Khoa Kỹ thuật - 2 ngành
  majors.push(
    await prisma.major.create({
      data: { code: 'ME', name: 'Kỹ thuật cơ khí', departmentId: departments[2].id },
    }),
    await prisma.major.create({
      data: { code: 'EE', name: 'Kỹ thuật điện', departmentId: departments[2].id },
    })
  );

  // Khoa Khoa học tự nhiên - 2 ngành
  majors.push(
    await prisma.major.create({
      data: { code: 'MATH', name: 'Toán học', departmentId: departments[3].id },
    }),
    await prisma.major.create({
      data: { code: 'PHY', name: 'Vật lý', departmentId: departments[3].id },
    })
  );

  // Khoa Ngoại ngữ - 2 ngành
  majors.push(
    await prisma.major.create({
      data: { code: 'ENG', name: 'Ngôn ngữ Anh', departmentId: departments[4].id },
    }),
    await prisma.major.create({
      data: { code: 'JAP', name: 'Ngôn ngữ Nhật', departmentId: departments[4].id },
    })
  );

  console.log(`✅ Created ${majors.length} majors`);

  // Tạo 5 lớp cho mỗi khoa (mỗi ngành có vài lớp)
  const classes = [];
  let classCounter = 1;

  for (const major of majors) {
    // Mỗi ngành tạo 2-3 lớp
    const numClasses = Math.random() > 0.5 ? 2 : 3;
    for (let i = 0; i < numClasses; i++) {
      const year = 20 + Math.floor(Math.random() * 5); // 2020-2024
      classes.push(
        await prisma.class.create({
          data: {
            code: `${major.code}${String(classCounter).padStart(2, '0')}`,
            name: `Lớp ${major.name} ${String(classCounter).padStart(2, '0')}`,
            majorId: major.id,
          },
        })
      );
      classCounter++;
    }
  }

  console.log(`✅ Created ${classes.length} classes\n`);

  return { departments, majors, classes };
}

/**
 * Seed Users - Mỗi khoa 10 giảng viên, mỗi lớp 15-20 sinh viên
 */
async function seedUsers(orgData: {
  departments: any[];
  majors: any[];
  classes: any[];
}) {
  console.log('👥 Seeding Users...');

  const { departments, majors, classes } = orgData;
  const allUsers = [];

  // Tạo Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@university.edu',
      password: '123456',
      name: 'Quản trị viên hệ thống',
      role: Role.ADMIN,
      code: 'ADMIN001',
      gender: Gender.MALE,
    },
  });
  allUsers.push(admin);
  console.log('✅ Created 1 ADMIN');

  // Tạo Dean cho mỗi khoa (5 Dean)
  const deans = [];
  for (let i = 0; i < departments.length; i++) {
    const dean = await prisma.user.create({
      data: {
        email: `dean.${departments[i].code.toLowerCase()}@university.edu`,
        password: '123456',
        name: `Trưởng khoa ${departments[i].name}`,
        role: Role.DEAN,
        code: `DEAN${String(i + 1).padStart(3, '0')}`,
        departmentId: departments[i].id,
        gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
        phone: `090${String(1000000 + i).substring(1)}`,
      },
    });
    deans.push(dean);
    allUsers.push(dean);
  }
  console.log(`✅ Created ${deans.length} DEANs`);

  // Tạo 10 giảng viên cho mỗi khoa
  const lecturers = [];
  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ'];
  const middleNames = ['Văn', 'Thị', 'Hữu', 'Minh', 'Thanh', 'Đức', 'Quốc', 'Anh', 'Hồng', 'Mai'];
  const lastNames = ['An', 'Bình', 'Chi', 'Dũng', 'Hà', 'Kiên', 'Linh', 'Nam', 'Phương', 'Sơn'];

  for (let deptIdx = 0; deptIdx < departments.length; deptIdx++) {
    for (let i = 0; i < 10; i++) {
      const lecturerNum = deptIdx * 10 + i + 1;
      const lecturer = await prisma.user.create({
        data: {
          email: `gv${String(lecturerNum).padStart(3, '0')}@university.edu`,
          password: '123456',
          name: `${firstNames[i]} ${middleNames[i % 10]} ${lastNames[i % 10]}`,
          role: Role.LECTURER,
          code: `GV${String(lecturerNum).padStart(3, '0')}`,
          departmentId: departments[deptIdx].id,
          gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
          phone: `091${String(1000000 + lecturerNum).substring(1)}`,
          address: `${i + 1} Nguyễn Văn Cừ, Q.5, TP.HCM`,
        },
      });
      lecturers.push(lecturer);
      allUsers.push(lecturer);
    }
  }
  console.log(`✅ Created ${lecturers.length} LECTURERs (10 per department)`);

  // Tạo sinh viên cho mỗi lớp (15-20 sinh viên/lớp)
  const students = [];
  const studentFirstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Phan', 'Vũ', 'Đặng', 'Bùi', 'Đỗ', 'Lý', 'Dương', 'Võ', 'Hồ', 'Đinh'];
  const studentLastNames = ['An', 'Bảo', 'Chi', 'Dung', 'Hà', 'Khoa', 'Linh', 'Minh', 'Nam', 'Phong', 'Quân', 'Trang', 'Uyên', 'Vân', 'Yến'];

  let studentCounter = 1;
  for (const classObj of classes) {
    // Lấy major để biết department
    const major = majors.find((m) => m.id === classObj.majorId);
    const numStudents = 15 + Math.floor(Math.random() * 6); // 15-20 sinh viên

    for (let i = 0; i < numStudents; i++) {
      const firstName = studentFirstNames[Math.floor(Math.random() * studentFirstNames.length)];
      const lastName = studentLastNames[Math.floor(Math.random() * studentLastNames.length)];
      
      const student = await prisma.user.create({
        data: {
          email: `sv${String(studentCounter).padStart(4, '0')}@university.edu`,
          password: '123456',
          name: `${firstName} Văn ${lastName}`,
          role: Role.STUDENT,
          code: `SV${String(studentCounter).padStart(4, '0')}`,
          departmentId: major.departmentId,
          majorId: major.id,
          classId: classObj.id,
          gender: i % 2 === 0 ? Gender.MALE : Gender.FEMALE,
          phone: `092${String(1000000 + studentCounter).substring(1)}`,
        },
      });
      students.push(student);
      allUsers.push(student);
      studentCounter++;
    }
  }
  console.log(`✅ Created ${students.length} STUDENTs (15-20 per class)\n`);

  return { admin, deans, lecturers, students, allUsers };
}

/**
 * Main seed function
 */
async function main() {
  console.log('🌱 Starting database seed...\n');
  console.log('=' .repeat(60));
  console.log('\n');

  // Step 1: Clear all existing data
  await clearDatabase();

  // Step 2: Seed organization structure (5 khoa, nhiều ngành, nhiều lớp)
  const orgData = await seedOrganization();

  // Step 3: Seed users (mỗi khoa 10 GV, mỗi lớp 15-20 SV)
  const users = await seedUsers(orgData);

  // Step 4: Seed progress report templates
  seedTemplates();

  console.log('\n🎉 Seed completed successfully!\n');
 
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
