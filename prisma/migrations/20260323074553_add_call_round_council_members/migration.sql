-- CreateTable
CREATE TABLE "CallRoundCouncilMember" (
    "id" TEXT NOT NULL,
    "callRoundId" TEXT NOT NULL,
    "councilMemberId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRoundCouncilMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallRoundCouncilMember_callRoundId_idx" ON "CallRoundCouncilMember"("callRoundId");

-- CreateIndex
CREATE INDEX "CallRoundCouncilMember_councilMemberId_idx" ON "CallRoundCouncilMember"("councilMemberId");

-- CreateIndex
CREATE UNIQUE INDEX "CallRoundCouncilMember_callRoundId_councilMemberId_key" ON "CallRoundCouncilMember"("callRoundId", "councilMemberId");

-- AddForeignKey
ALTER TABLE "CallRoundCouncilMember" ADD CONSTRAINT "CallRoundCouncilMember_callRoundId_fkey" FOREIGN KEY ("callRoundId") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRoundCouncilMember" ADD CONSTRAINT "CallRoundCouncilMember_councilMemberId_fkey" FOREIGN KEY ("councilMemberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
