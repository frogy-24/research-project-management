import { Role, ProjectStatus, Gender } from './generated/prisma';
import prisma from '../lib/prisma';

async function seedTemplates() {
  console.log('📋 Seeding Progress Report Templates...');
  
  // Xóa dữ liệu template cũ (nếu có)
  await prisma.progressReportTemplateItem.deleteMany();
  await prisma.progressReportTemplate.deleteMany();

  // Template 1: Đề tài nghiên cứu khoa học sinh viên
  const template1 = await prisma.progressReportTemplate.create({
    data: {
      name: 'Biểu mẫu NCKH Sinh viên - 12 tuần',
      description: 'Biểu mẫu tiêu chuẩn cho đề tài nghiên cứu khoa học sinh viên, theo dõi tiến độ 12 tuần',
      isActive: true,
      items: {
        create: [
          {
            weekNumber: 1,
            weekLabel: 'Tuần 1-2',
            taskDescription: 'Nghiên cứu tài liệu, xác định phạm vi đề tài',
            contentGuideline: '- Tổng hợp các tài liệu liên quan\n- Xác định vấn đề nghiên cứu\n- Làm rõ mục tiêu và phạm vi',
            expectedResult: 'Bản tổng hợp tài liệu tham khảo, outline nghiên cứu ban đầu',
            orderIndex: 0,
          },
          {
            weekNumber: 3,
            weekLabel: 'Tuần 3-4',
            taskDescription: 'Xây dựng khung lý thuyết và phương pháp nghiên cứu',
            contentGuideline: '- Tổng quan các nghiên cứu liên quan\n- Xây dựng khung lý thuyết\n- Lựa chọn phương pháp nghiên cứu phù hợp',
            expectedResult: 'Chương 1, 2 hoàn chỉnh (Tổng quan, Cơ sở lý thuyết)',
            orderIndex: 1,
          },
          {
            weekNumber: 5,
            weekLabel: 'Tuần 5-6',
            taskDescription: 'Thiết kế nghiên cứu, chuẩn bị công cụ thu thập dữ liệu',
            contentGuideline: '- Thiết kế mô hình/kiến trúc hệ thống\n- Chuẩn bị bảng hỏi/công cụ đo lường\n- Pilot test',
            expectedResult: 'Thiết kế chi tiết, công cụ thu thập dữ liệu hoàn chỉnh',
            orderIndex: 2,
          },
          {
            weekNumber: 7,
            weekLabel: 'Tuần 7-8',
            taskDescription: 'Thu thập dữ liệu/Triển khai thực nghiệm',
            contentGuideline: '- Tiến hành khảo sát/phỏng vấn/thí nghiệm\n- Ghi chép dữ liệu chi tiết\n- Backup dữ liệu',
            expectedResult: 'Dữ liệu thô đã thu thập, nhật ký nghiên cứu',
            orderIndex: 3,
          },
          {
            weekNumber: 9,
            weekLabel: 'Tuần 9-10',
            taskDescription: 'Phân tích dữ liệu, rút ra kết quả',
            contentGuideline: '- Làm sạch và mã hóa dữ liệu\n- Phân tích thống kê/chạy mô hình\n- Trực quan hóa kết quả',
            expectedResult: 'Bảng biểu, đồ thị phân tích, kết quả thống kê ban đầu',
            orderIndex: 4,
          },
          {
            weekNumber: 11,
            weekLabel: 'Tuần 11',
            taskDescription: 'Viết chương kết quả và thảo luận',
            contentGuideline: '- Trình bày kết quả nghiên cứu\n- So sánh với các nghiên cứu trước\n- Thảo luận ý nghĩa và hạn chế',
            expectedResult: 'Chương 3, 4 hoàn chỉnh (Kết quả và Thảo luận)',
            orderIndex: 5,
          },
          {
            weekNumber: 12,
            weekLabel: 'Tuần 12',
            taskDescription: 'Hoàn thiện báo cáo, chuẩn bị bảo vệ',
            contentGuideline: '- Viết phần kết luận và kiến nghị\n- Hoàn thiện toàn bộ báo cáo\n- Chuẩn bị slide thuyết trình\n- Luyện tập bảo vệ',
            expectedResult: 'Báo cáo hoàn chỉnh, slide thuyết trình, sẵn sàng bảo vệ',
            orderIndex: 6,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Template 2: Đề tài phát triển phần mềm
  const template2 = await prisma.progressReportTemplate.create({
    data: {
      name: 'Biểu mẫu Phát triển Phần mềm - 10 tuần',
      description: 'Biểu mẫu cho đề tài phát triển ứng dụng/hệ thống phần mềm',
      isActive: true,
      items: {
        create: [
          {
            weekNumber: 1,
            weekLabel: 'Tuần 1-2',
            taskDescription: 'Phân tích yêu cầu và thiết kế tổng thể',
            contentGuideline: '- Thu thập yêu cầu chức năng và phi chức năng\n- Phân tích use case\n- Thiết kế kiến trúc tổng thể',
            expectedResult: 'Tài liệu đặc tả yêu cầu, sơ đồ use case, kiến trúc hệ thống',
            orderIndex: 0,
          },
          {
            weekNumber: 3,
            weekLabel: 'Tuần 3-4',
            taskDescription: 'Thiết kế chi tiết và chuẩn bị môi trường',
            contentGuideline: '- Thiết kế database schema\n- Thiết kế giao diện (wireframe/mockup)\n- Setup môi trường dev',
            expectedResult: 'ERD, mockup UI, repository code đã khởi tạo với tech stack',
            orderIndex: 1,
          },
          {
            weekNumber: 5,
            weekLabel: 'Tuần 5-6',
            taskDescription: 'Phát triển Module 1 (Core features)',
            contentGuideline: '- Implement các chức năng cốt lõi\n- Viết unit tests\n- Code review định kỳ',
            expectedResult: 'Module 1 hoàn thành, pass unit tests, demo được',
            orderIndex: 2,
          },
          {
            weekNumber: 7,
            weekLabel: 'Tuần 7',
            taskDescription: 'Phát triển Module 2 (Extended features)',
            contentGuideline: '- Implement các chức năng mở rộng\n- Integration testing\n- Refactoring nếu cần',
            expectedResult: 'Module 2 hoàn thành, tích hợp với Module 1',
            orderIndex: 3,
          },
          {
            weekNumber: 8,
            weekLabel: 'Tuần 8',
            taskDescription: 'Tối ưu hóa và bảo mật',
            contentGuideline: '- Performance tuning\n- Security hardening\n- Load testing',
            expectedResult: 'Hệ thống tối ưu, đã kiểm tra bảo mật, benchmark report',
            orderIndex: 4,
          },
          {
            weekNumber: 9,
            weekLabel: 'Tuần 9',
            taskDescription: 'Testing tổng thể và sửa lỗi',
            contentGuideline: '- UAT (User Acceptance Testing)\n- Bug fixing\n- Viết test cases',
            expectedResult: 'Bug report, test coverage > 80%, ổn định',
            orderIndex: 5,
          },
          {
            weekNumber: 10,
            weekLabel: 'Tuần 10',
            taskDescription: 'Hoàn thiện tài liệu và triển khai',
            contentGuideline: '- Viết user manual\n- Deployment lên server\n- Chuẩn bị video demo và slide',
            expectedResult: 'Sản phẩm deployed, tài liệu hoàn chỉnh, video demo, sẵn sàng bảo vệ',
            orderIndex: 6,
          },
        ],
      },
    },
    include: { items: true },
  });

  // Template 3: Template không active (để test)
  const template3 = await prisma.progressReportTemplate.create({
    data: {
      name: 'Biểu mẫu Cũ - Ngừng sử dụng',
      description: 'Template này không còn sử dụng nữa',
      isActive: false,
      items: {
        create: [
          {
            weekNumber: 1,
            weekLabel: 'Tuần 1',
            taskDescription: 'Giai đoạn 1',
            contentGuideline: 'Nội dung giai đoạn 1',
            expectedResult: 'Kết quả mong đợi',
            orderIndex: 0,
          },
        ],
      },
    },
    include: { items: true },
  });

  console.log(`✅ Created ${template1.name} (${template1.items.length} items)`);
  console.log(`✅ Created ${template2.name} (${template2.items.length} items)`);
  console.log(`✅ Created ${template3.name} (${template3.items.length} items)`);
}

async function seedOrganization() {
  console.log('🌱 Seeding Organization data...');

  // 1. Create Departments
  const itDept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: {
      code: 'IT',
      name: 'Khoa Công nghệ thông tin',
      description: 'Khoa đào tạo về CNTT, Phần mềm, Mạng máy tính',
    },
  });

  const businessDept = await prisma.department.upsert({
    where: { code: 'BUS' },
    update: {},
    create: {
      code: 'BUS',
      name: 'Khoa Kinh tế',
      description: 'Khoa đào tạo về Quản trị kinh doanh, Kế toán',
    },
  });

  console.log('✅ Departments created');

  // 2. Create Majors
  const softwareMajor = await prisma.major.upsert({
    where: { code: 'SE' },
    update: {},
    create: {
      code: 'SE',
      name: 'Kỹ thuật phần mềm',
      departmentId: itDept.id,
    },
  });

  const networkMajor = await prisma.major.upsert({
    where: { code: 'NET' },
    update: {},
    create: {
      code: 'NET',
      name: 'Mạng máy tính',
      departmentId: itDept.id,
    },
  });

  const marketingMajor = await prisma.major.upsert({
    where: { code: 'MKT' },
    update: {},
    create: {
      code: 'MKT',
      name: 'Marketing',
      departmentId: businessDept.id,
    },
  });

  console.log('✅ Majors created');

  // 3. Create Classes
  const seClass = await prisma.class.upsert({
    where: { code: 'SE01' },
    update: {},
    create: {
      code: 'SE01',
      name: 'Lớp Kỹ thuật phần mềm 01',
      majorId: softwareMajor.id,
    },
  });

  const netClass = await prisma.class.upsert({
    where: { code: 'NET01' },
    update: {},
    create: {
      code: 'NET01',
      name: 'Lớp Mạng máy tính 01',
      majorId: networkMajor.id,
    },
  });

  console.log('✅ Classes created');

  // 4. Update existing users with organization info
  const student = await prisma.user.findFirst({
    where: { role: Role.STUDENT },
  });

  if (student) {
    await prisma.user.update({
      where: { id: student.id },
      data: {
        departmentId: itDept.id,
        majorId: softwareMajor.id,
        classId: seClass.id,
      },
    });
    console.log(`✅ Updated student ${student.name} with organization info`);
  }

  const lecturer = await prisma.user.findFirst({
    where: { role: Role.LECTURER },
  });

  if (lecturer) {
    await prisma.user.update({
      where: { id: lecturer.id },
      data: {
        departmentId: itDept.id,
      },
    });
    console.log(`✅ Updated lecturer ${lecturer.name} with organization info`);
  }
}

async function seedUsersAndProjects() {
  console.log('👥 Seeding Users and Projects...');
  
  // Student
  const student = await prisma.user.upsert({
    where: { email: 'student1@university.edu.vn' },
    update: {},
    create: {
      email: 'student1@university.edu.vn',
      name: 'Nguyễn Văn Sinh Viên',
      role: Role.STUDENT,
      code: 'SV001',
    },
  });

  // Lecturer to be instructor
  const lecturer = await prisma.user.upsert({
    where: { email: 'lecturer1@university.edu.vn' },
    update: {},
    create: {
      email: 'lecturer1@university.edu.vn',
      name: 'Trần Văn Giảng Viên',
      role: Role.LECTURER,
      code: 'GV001',
    },
  });

  // Lecturer level 2 to be instructor
  const seniorLecturer = await prisma.user.upsert({
    where: { email: 'senior_lecturer1@university.edu.vn' },
    update: {},
    create: {
      email: 'senior_lecturer1@university.edu.vn',
      name: 'Phạm Văn Giảng Viên Cao Cấp',
      role: Role.LECTURER,
      code: 'GV002',
    },
  });

  // A Project for the student
  await prisma.project.create({
    data: {
      title: 'Hệ thống ứng dụng AI trong quản lý giáo dục (SV)',
      objective: 'Nghiên cứu và áp dụng AI',
      expectedOutput: 'Phần mềm Web',
      status: ProjectStatus.IN_PROGRESS,
      leaderId: student.id,
      instructorId: lecturer.id,
    }
  });

  // A Project for the lecturer
  await prisma.project.create({
    data: {
      title: 'Nghiên cứu vật liệu mới (GV)',
      objective: 'Tìm hiểu vật liệu',
      expectedOutput: 'Bài báo ISI',
      status: ProjectStatus.IN_PROGRESS,
      leaderId: lecturer.id,
      instructorId: seniorLecturer.id,
    }
  });

  console.log('✅ Users and Projects seeded!');
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  // await seedTemplates();
  await seedOrganization();
  await seedUsersAndProjects();


  console.log('\n🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
