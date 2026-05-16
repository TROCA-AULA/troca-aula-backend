-- AlterTable
ALTER TABLE "Classes" ADD COLUMN     "available" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "EnrollmentRequest" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "professorId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EnrollmentRequest_classId_idx" ON "EnrollmentRequest"("classId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_professorId_idx" ON "EnrollmentRequest"("professorId");

-- CreateIndex
CREATE INDEX "EnrollmentRequest_status_idx" ON "EnrollmentRequest"("status");

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentRequest" ADD CONSTRAINT "EnrollmentRequest_professorId_fkey" FOREIGN KEY ("professorId") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
