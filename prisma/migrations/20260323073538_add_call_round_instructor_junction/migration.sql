-- CreateTable
CREATE TABLE "CallRoundInstructor" (
    "id" TEXT NOT NULL,
    "callRoundId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallRoundInstructor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CallRoundInstructor_callRoundId_idx" ON "CallRoundInstructor"("callRoundId");

-- CreateIndex
CREATE INDEX "CallRoundInstructor_instructorId_idx" ON "CallRoundInstructor"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "CallRoundInstructor_callRoundId_instructorId_key" ON "CallRoundInstructor"("callRoundId", "instructorId");

-- AddForeignKey
ALTER TABLE "CallRoundInstructor" ADD CONSTRAINT "CallRoundInstructor_callRoundId_fkey" FOREIGN KEY ("callRoundId") REFERENCES "CallRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallRoundInstructor" ADD CONSTRAINT "CallRoundInstructor_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
