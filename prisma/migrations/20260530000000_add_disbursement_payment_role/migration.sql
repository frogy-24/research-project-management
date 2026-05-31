-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DISBURSER';

-- AlterEnum
ALTER TYPE "DisbursementStatus" ADD VALUE IF NOT EXISTS 'PAID';

-- AlterTable
ALTER TABLE "FundingDisbursement" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paidById" TEXT,
ADD COLUMN     "paymentNote" TEXT,
ADD COLUMN     "paymentVoucherUrl" TEXT;

-- CreateIndex
CREATE INDEX "FundingDisbursement_paidById_idx" ON "FundingDisbursement"("paidById");

-- AddForeignKey
ALTER TABLE "FundingDisbursement" ADD CONSTRAINT "FundingDisbursement_paidById_fkey" FOREIGN KEY ("paidById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
