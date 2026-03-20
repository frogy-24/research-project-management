import prisma from './lib/prisma';
import { RegistrationStatus, InstructorStatus } from './prisma/generated/prisma';

async function main() {
  const users = await prisma.user.findMany();
  console.log("Found users (total):", users.length);
  
  // Create if missing
  let student = users.find(u => u.role === 'STUDENT');
  if (!student) {
    console.log("Creating new student user...");
    student = await prisma.user.create({
      data: {
        name: "Nguyễn Văn Sinh Viên",
        email: "student99@university.edu.vn",
        role: "STUDENT",
        department: "CNTT"
      }
    });
  }

  let lecturer = users.find(u => u.role === 'LECTURER');
  if (!lecturer) {
    console.log("Creating new lecturer user...");
    lecturer = await prisma.user.create({
      data: {
        name: "TS. Trần Giảng Viên",
        email: "lecturer99@university.edu.vn",
        role: "LECTURER",
        department: "CNTT"
      }
    });
  }

  // 1. Pending registration with instructor
  await prisma.projectRegistration.create({
    data: {
      userId: student.id,
      title: "Nghiên cứu ứng dụng AI trong quản lý giáo dục (" + Date.now() + ")",
      objective: "Xây dựng hệ thống chat bot hỗ trợ sinh viên",
      expectedOutput: "01 Phần mềm, 01 Báo cáo",
      status: RegistrationStatus.PENDING,
      instructorId: lecturer.id,
      instructorStatus: InstructorStatus.PENDING,
    }
  });

  console.log("Seeded project registration successfully. Sent to Instructor:", lecturer.name);
}

main().catch(console.error).finally(() => prisma.$disconnect());
