-- CreateEnum
CREATE TYPE "ApplicableFor" AS ENUM ('STUDENT', 'LECTURER', 'BOTH');

-- AlterTable
ALTER TABLE "CallRound" ADD COLUMN     "applicableFor" "ApplicableFor" NOT NULL DEFAULT 'STUDENT';
