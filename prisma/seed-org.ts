import { Role, Gender } from './generated/prisma/index.js';
import prisma from '../lib/prisma';

async function main() {
  console.log('🌱 Seeding Organization data...\n');

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

  console.log('\n🎉 Organization seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
