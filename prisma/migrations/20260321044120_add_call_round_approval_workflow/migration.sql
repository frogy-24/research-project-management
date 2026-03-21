-- CreateEnum
CREATE TYPE "CallRoundApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "CallRound" ADD COLUMN     "approvalNote" TEXT,
ADD COLUMN     "approvalStatus" "CallRoundApprovalStatus" NOT NULL DEFAULT 'APPROVED',
ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "createdByRole" "Role";
