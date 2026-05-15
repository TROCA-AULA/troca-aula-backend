/*
  Warnings:

  - You are about to drop the `SwapRequests` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "SwapRequests" DROP CONSTRAINT "SwapRequests_classId_fkey";

-- DropForeignKey
ALTER TABLE "SwapRequests" DROP CONSTRAINT "SwapRequests_requesterId_fkey";

-- DropForeignKey
ALTER TABLE "SwapRequests" DROP CONSTRAINT "SwapRequests_targetId_fkey";

-- DropTable
DROP TABLE "SwapRequests";
