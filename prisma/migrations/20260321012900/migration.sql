/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'CANCELED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InstructorStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FacultyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'STUDENT';

-- AlterTable
ALTER TABLE "CallRound" ADD COLUMN     "templateId" TEXT;

-- AlterTable
ALTER TABLE "ProgressReport" ADD COLUMN     "fromDate" TIMESTAMP(3),
ADD COLUMN     "mentorReview" TEXT,
ADD COLUMN     "mentorScore" DOUBLE PRECISION,
ADD COLUMN     "performedContent" TEXT,
ADD COLUMN     "reportContent" TEXT,
ADD COLUMN     "results" TEXT,
ADD COLUMN     "tasks" TEXT,
ADD COLUMN     "toDate" TIMESTAMP(3),
ADD COLUMN     "week" INTEGER;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "instructorId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "classId" TEXT,
ADD COLUMN     "code" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "majorId" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Major" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Major_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "majorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressReportTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressReportTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgressReportTemplateItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "weekNumber" INTEGER NOT NULL,
    "weekLabel" TEXT NOT NULL,
    "taskDescription" TEXT NOT NULL,
    "contentGuideline" TEXT,
    "expectedResult" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressReportTemplateItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "callRoundId" TEXT,
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "expectedOutput" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "instructorId" TEXT,
    "instructorStatus" "InstructorStatus" NOT NULL DEFAULT 'PENDING',
    "facultyStatus" "FacultyStatus" NOT NULL DEFAULT 'PENDING',
    "facultyReviewerId" TEXT,

    CONSTRAINT "ProjectRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CallRoundDepartments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CallRoundDepartments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CallRoundMajors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CallRoundMajors_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CallRoundClasses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CallRoundClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_code_key" ON "Department"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Major_code_key" ON "Major"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Class_code_key" ON "Class"("code");

-- CreateIndex
CREATE INDEX "ProgressReportTemplateItem_templateId_orderIndex_idx" ON "ProgressReportTemplateItem"("templateId", "orderIndex");

-- CreateIndex
CREATE UNIQUE INDEX "ProgressReportTemplateItem_templateId_weekNumber_key" ON "ProgressReportTemplateItem"("templateId", "weekNumber");

-- CreateIndex
CREATE INDEX "_CallRoundDepartments_B_index" ON "_CallRoundDepartments"("B");

-- CreateIndex
CREATE INDEX "_CallRoundMajors_B_index" ON "_CallRoundMajors"("B");

-- CreateIndex
CREATE INDEX "_CallRoundClasses_B_index" ON "_CallRoundClasses"("B");

-- CreateIndex
CREATE UNIQUE INDEX "User_code_key" ON "User"("code");

-- AddForeignKey
ALTER TABLE "Major" ADD CONSTRAINT "Major_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_majorId_fkey" FOREIGN KEY ("majorId") REFERENCES "Major"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRound" ADD CONSTRAINT "CallRound_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProgressReportTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressReportTemplateItem" ADD CONSTRAINT "ProgressReportTemplateItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ProgressReportTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRegistration" ADD CONSTRAINT "ProjectRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRegistration" ADD CONSTRAINT "ProjectRegistration_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRegistration" ADD CONSTRAINT "ProjectRegistration_callRoundId_fkey" FOREIGN KEY ("callRoundId") REFERENCES "CallRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRegistration" ADD CONSTRAINT "ProjectRegistration_facultyReviewerId_fkey" FOREIGN KEY ("facultyReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CallRoundDepartments" ADD CONSTRAINT "_CallRoundDepartments_A_fkey" FOREIGN KEY ("A") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CallRoundDepartments" ADD CONSTRAINT "_CallRoundDepartments_B_fkey" FOREIGN KEY ("B") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CallRoundMajors" ADD CONSTRAINT "_CallRoundMajors_A_fkey" FOREIGN KEY ("A") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CallRoundMajors" ADD CONSTRAINT "_CallRoundMajors_B_fkey" FOREIGN KEY ("B") REFERENCES "Major"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CallRoundClasses" ADD CONSTRAINT "_CallRoundClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CallRoundClasses" ADD CONSTRAINT "_CallRoundClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
