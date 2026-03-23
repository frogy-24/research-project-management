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

  // Tạo thành viên Hội đồng (3-5 người cho mỗi khoa)
  const councilMembers = [];
  const councilTitles = ['PGS.TS', 'TS', 'ThS', 'GS.TS'];
  
  for (let deptIdx = 0; deptIdx < departments.length; deptIdx++) {
    const numCouncil = 3 + Math.floor(Math.random() * 3); // 3-5 thành viên/khoa
    for (let i = 0; i < numCouncil; i++) {
      const councilNum = deptIdx * 5 + i + 1;
      const title = councilTitles[i % councilTitles.length];
      const council = await prisma.user.create({
        data: {
          email: `hd${String(councilNum).padStart(3, '0')}@university.edu`,
          password: '123456',
          name: `${title}. ${firstNames[(i + 3) % 10]} ${middleNames[(i + 5) % 10]} ${lastNames[(i + 7) % 10]}`,
          role: Role.COUNCIL,
          code: `HD${String(councilNum).padStart(3, '0')}`,
          departmentId: departments[deptIdx].id,
          gender: i % 3 === 0 ? Gender.FEMALE : Gender.MALE,
          phone: `093${String(1000000 + councilNum).substring(1)}`,
          address: `Phòng ${100 + councilNum}, Nhà A, Trường Đại học`,
        },
      });
      councilMembers.push(council);
      allUsers.push(council);
    }
  }
  console.log(`✅ Created ${councilMembers.length} COUNCIL members (3-5 per department)`);

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

  return { admin, deans, lecturers, councilMembers, students, allUsers };
}

/**
 * Seed 50 ProjectRegistrations cho khoa CNTT
 */
async function seedProjectRegistrationsForIT(orgData: {
  departments: any[];
  majors: any[];
  classes: any[];
}) {
  console.log('📝 Seeding Project Registrations for IT Department (50 records)...');

  const { departments } = orgData;
  
  // Tìm khoa CNTT
  const itDept = departments.find((d) => d.code === 'IT');
  if (!itDept) {
    console.log('❌ IT Department not found, skipping registrations seed');
    return;
  }

  // Lấy sinh viên thuộc khoa CNTT
  const itStudents = await prisma.user.findMany({
    where: {
      role: 'STUDENT',
      departmentId: itDept.id,
    },
    take: 60, // Lấy tối đa 60 sinh viên
  });

  // Lấy giảng viên thuộc khoa CNTT
  const itLecturers = await prisma.user.findMany({
    where: {
      role: 'LECTURER',
      departmentId: itDept.id,
    },
  });

  if (itStudents.length === 0) {
    console.log('❌ No IT students found, skipping registrations seed');
    return;
  }

  // Danh sách đề tài mẫu CNTT
  const projectTopics = [
    'Xây dựng hệ thống quản lý thư viện trực tuyến',
    'Phát triển ứng dụng di động hỗ trợ học tập',
    'Thiết kế hệ thống IoT giám sát môi trường',
    'Xây dựng chatbot hỗ trợ tư vấn học đường',
    'Phát triển website thương mại điện tử',
    'Ứng dụng Machine Learning trong nhận diện khuôn mặt',
    'Xây dựng hệ thống quản lý bệnh viện',
    'Phát triển game 2D giáo dục cho trẻ em',
    'Thiết kế hệ thống điểm danh bằng mã QR',
    'Xây dựng ứng dụng đặt lịch khám bệnh online',
    'Phát triển hệ thống quản lý kho hàng',
    'Ứng dụng AI trong phân loại rác thải',
    'Xây dựng platform học trực tuyến',
    'Phát triển ứng dụng quản lý tài chính cá nhân',
    'Thiết kế hệ thống giám sát giao thông thông minh',
    'Xây dựng mạng xã hội cho sinh viên',
    'Phát triển ứng dụng đọc sách điện tử',
    'Ứng dụng Blockchain trong quản lý chứng chỉ',
    'Xây dựng hệ thống bán vé sự kiện online',
    'Phát triển robot tự động phục vụ',
    'Thiết kế hệ thống smart home',
    'Xây dựng ứng dụng tìm việc làm',
    'Phát triển hệ thống quản lý sinh viên',
    'Ứng dụng AR trong giáo dục lịch sử',
    'Xây dựng website tin tức tự động',
  ];

  const objectives = [
    'Nghiên cứu và phát triển giải pháp công nghệ nhằm tối ưu hóa quy trình',
    'Ứng dụng các công nghệ mới để giải quyết vấn đề thực tế',
    'Phát triển sản phẩm phần mềm đáp ứng nhu cầu người dùng',
    'Nghiên cứu các thuật toán và phương pháp tiên tiến',
    'Xây dựng giải pháp tích hợp đa nền tảng',
  ];

  const expectedOutputs = [
    'Sản phẩm phần mềm hoàn chỉnh có thể đưa vào sử dụng',
    'Hệ thống đáp ứng các tiêu chí kỹ thuật đề ra',
    'Ứng dụng được triển khai thực tế tại đơn vị',
    'Tài liệu kỹ thuật và hướng dẫn sử dụng đầy đủ',
    'Prototype sản phẩm kèm báo cáo nghiên cứu',
  ];

  const statuses: Array<'PENDING' | 'APPROVED' | 'REJECTED'> = ['PENDING', 'APPROVED', 'REJECTED'];
  const instructorStatuses: Array<'PENDING' | 'ACCEPTED' | 'REJECTED'> = ['PENDING', 'ACCEPTED', 'REJECTED'];
  const facultyStatuses: Array<'PENDING' | 'APPROVED' | 'REJECTED'> = ['PENDING', 'APPROVED', 'REJECTED'];

  const registrations = [];

  for (let i = 0; i < 50; i++) {
    const student = itStudents[i % itStudents.length];
    const instructor = itLecturers[i % itLecturers.length];
    const topic = projectTopics[i % projectTopics.length];
    const objective = objectives[i % objectives.length];
    const expectedOutput = expectedOutputs[i % expectedOutputs.length];

    // Tạo các trạng thái ngẫu nhiên nhưng hợp lý
    const instructorStatus = instructorStatuses[Math.floor(Math.random() * instructorStatuses.length)];
    // Nếu instructor đã duyệt, faculty có thể duyệt; ngược lại faculty chờ
    const facultyStatus = instructorStatus === 'ACCEPTED' 
      ? facultyStatuses[Math.floor(Math.random() * facultyStatuses.length)]
      : 'PENDING';

    const registration = await prisma.projectRegistration.create({
      data: {
        userId: student.id,
        title: `${topic} - Phiên bản ${i + 1}`,
        objective: `${objective}. Đề tài số ${i + 1} trong lĩnh vực CNTT.`,
        expectedOutput: expectedOutput,
        status: 'PENDING',
        instructorId: instructor.id,
        instructorStatus: instructorStatus,
        facultyStatus: facultyStatus,
      },
    });
    registrations.push(registration);
  }

  console.log(`✅ Created ${registrations.length} Project Registrations for IT Department\n`);
  return registrations;
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

  // Step 5: Seed project registrations for IT Department (50 records)
  await seedProjectRegistrationsForIT(orgData);

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
