/*
  Warnings:

  - Added the required column `updatedAt` to the `CallRoundCouncilMember` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `CallRoundInstructor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `createdById` to the `FundingDisbursement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `FundingDisbursement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DisbursementStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostAudience" AS ENUM ('LECTURERS', 'STUDENTS', 'DEPARTMENT', 'ALL');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "CallRound" ADD COLUMN     "defenseDate" TIMESTAMP(3),
ADD COLUMN     "invitationDeadline" TIMESTAMP(3),
ADD COLUMN     "projectLockDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CallRoundCouncilMember" ADD COLUMN     "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "CallRoundInstructor" ADD COLUMN     "invitationStatus" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "respondedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "FundingDisbursement" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "reason" TEXT,
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "status" "DisbursementStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ProjectRegistration" ADD COLUMN     "teamMembers" JSONB;

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "audience" "PostAudience" NOT NULL DEFAULT 'ALL',
    "status" "PostStatus" NOT NULL DEFAULT 'PENDING',
    "authorId" TEXT NOT NULL,
    "authorRole" "Role" NOT NULL,
    "departmentId" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacity" INTEGER,
    "description" TEXT,
    "departmentId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeMeeting" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "memberUserIds" TEXT[],
    "meetingAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT NOT NULL,
    "roomId" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OfficeMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfficeMeetingView" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "OfficeMeetingView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallRoundAttachment" (
    "id" TEXT NOT NULL,
    "callRoundId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "fileType" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRoundAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Post_status_createdAt_idx" ON "Post"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_audience_status_idx" ON "Post"("audience", "status");

-- CreateIndex
CREATE INDEX "Post_departmentId_status_idx" ON "Post"("departmentId", "status");

-- CreateIndex
CREATE INDEX "Post_authorId_createdAt_idx" ON "Post"("authorId", "createdAt");

-- CreateIndex
CREATE INDEX "Room_departmentId_idx" ON "Room"("departmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Room_code_departmentId_key" ON "Room"("code", "departmentId");

-- CreateIndex
CREATE INDEX "OfficeMeeting_projectId_idx" ON "OfficeMeeting"("projectId");

-- CreateIndex
CREATE INDEX "OfficeMeeting_instructorId_idx" ON "OfficeMeeting"("instructorId");

-- CreateIndex
CREATE INDEX "OfficeMeeting_roomId_idx" ON "OfficeMeeting"("roomId");

-- CreateIndex
CREATE INDEX "OfficeMeetingView_userId_idx" ON "OfficeMeetingView"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OfficeMeetingView_meetingId_userId_key" ON "OfficeMeetingView"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "CallRoundAttachment_callRoundId_idx" ON "CallRoundAttachment"("callRoundId");

-- CreateIndex
CREATE INDEX "CallRoundCouncilMember_invitationStatus_idx" ON "CallRoundCouncilMember"("invitationStatus");

-- CreateIndex
CREATE INDEX "CallRoundInstructor_invitationStatus_idx" ON "CallRoundInstructor"("invitationStatus");

-- CreateIndex
CREATE INDEX "FundingDisbursement_projectId_idx" ON "FundingDisbursement"("projectId");

-- CreateIndex
CREATE INDEX "FundingDisbursement_status_idx" ON "FundingDisbursement"("status");

-- CreateIndex
CREATE INDEX "FundingDisbursement_createdById_idx" ON "FundingDisbursement"("createdById");

-- CreateIndex
CREATE INDEX "FundingDisbursement_approvedById_idx" ON "FundingDisbursement"("approvedById");

-- AddForeignKey
ALTER TABLE "FundingDisbursement" ADD CONSTRAINT "FundingDisbursement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingDisbursement" ADD CONSTRAINT "FundingDisbursement_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMeeting" ADD CONSTRAINT "OfficeMeeting_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMeeting" ADD CONSTRAINT "OfficeMeeting_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMeeting" ADD CONSTRAINT "OfficeMeeting_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMeetingView" ADD CONSTRAINT "OfficeMeetingView_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "OfficeMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfficeMeetingView" ADD CONSTRAINT "OfficeMeetingView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRoundAttachment" ADD CONSTRAINT "CallRoundAttachment_callRoundId_fkey" FOREIGN KEY ("callRoundId") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
