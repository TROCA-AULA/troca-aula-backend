-- AlterTable
ALTER TABLE "Classes" ADD COLUMN     "dayOfWeek" INTEGER,
ADD COLUMN     "endTime" TEXT,
ADD COLUMN     "enrolledById" INTEGER,
ADD COLUMN     "startTime" TEXT;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "subjectId" INTEGER;

-- CreateTable
CREATE TABLE "SwapRequests" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "classId" INTEGER NOT NULL,
    "requesterId" INTEGER NOT NULL,
    "targetId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SwapRequests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SwapRequests_classId_idx" ON "SwapRequests"("classId");

-- CreateIndex
CREATE INDEX "SwapRequests_requesterId_idx" ON "SwapRequests"("requesterId");

-- CreateIndex
CREATE INDEX "SwapRequests_targetId_idx" ON "SwapRequests"("targetId");

-- CreateIndex
CREATE INDEX "SwapRequests_status_idx" ON "SwapRequests"("status");

-- AddForeignKey
ALTER TABLE "SwapRequests" ADD CONSTRAINT "SwapRequests_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequests" ADD CONSTRAINT "SwapRequests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SwapRequests" ADD CONSTRAINT "SwapRequests_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Classes" ADD CONSTRAINT "Classes_enrolledById_fkey" FOREIGN KEY ("enrolledById") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
