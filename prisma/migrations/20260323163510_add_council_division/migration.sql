-- CreateTable
CREATE TABLE "Council" (
    "id" TEXT NOT NULL,
    "callRoundId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Council_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilMemberAssignment" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "councilMemberId" TEXT NOT NULL,
    "role" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouncilMemberAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectCouncilAssignment" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "projectRegistrationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectCouncilAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Council_callRoundId_idx" ON "Council"("callRoundId");

-- CreateIndex
CREATE INDEX "CouncilMemberAssignment_councilId_idx" ON "CouncilMemberAssignment"("councilId");

-- CreateIndex
CREATE INDEX "CouncilMemberAssignment_councilMemberId_idx" ON "CouncilMemberAssignment"("councilMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilMemberAssignment_councilId_councilMemberId_key" ON "CouncilMemberAssignment"("councilId", "councilMemberId");

-- CreateIndex
CREATE INDEX "ProjectCouncilAssignment_councilId_idx" ON "ProjectCouncilAssignment"("councilId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectCouncilAssignment_projectRegistrationId_key" ON "ProjectCouncilAssignment"("projectRegistrationId");

-- AddForeignKey
ALTER TABLE "Council" ADD CONSTRAINT "Council_callRoundId_fkey" FOREIGN KEY ("callRoundId") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMemberAssignment" ADD CONSTRAINT "CouncilMemberAssignment_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMemberAssignment" ADD CONSTRAINT "CouncilMemberAssignment_councilMemberId_fkey" FOREIGN KEY ("councilMemberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCouncilAssignment" ADD CONSTRAINT "ProjectCouncilAssignment_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectCouncilAssignment" ADD CONSTRAINT "ProjectCouncilAssignment_projectRegistrationId_fkey" FOREIGN KEY ("projectRegistrationId") REFERENCES "ProjectRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
