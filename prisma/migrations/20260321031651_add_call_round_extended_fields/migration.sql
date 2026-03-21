/*
  Warnings:

  - Added the required column `registrationEndDate` to the `CallRound` table without a default value. This is not possible if the table is not empty.
  - Added the required column `registrationStartDate` to the `CallRound` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "CallRound" ADD COLUMN     "budgetLimit" DECIMAL(12,2),
ADD COLUMN     "contactInfo" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "guidelines" TEXT,
ADD COLUMN     "maxProjects" INTEGER,
ADD COLUMN     "projectEndDate" TIMESTAMP(3),
ADD COLUMN     "projectStartDate" TIMESTAMP(3),
ADD COLUMN     "registrationEndDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "registrationStartDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reportingStartDate" TIMESTAMP(3),
ADD COLUMN     "requirements" TEXT,
ADD COLUMN     "reviewDeadline" TIMESTAMP(3);
