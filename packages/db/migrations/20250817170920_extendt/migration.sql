/*
  Warnings:

  - Added the required column `period` to the `ComplianceReport` table without a default value. This is not possible if the table is not empty.
  - Added the required column `content` to the `DocumentReview` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ComplianceReport" ADD COLUMN     "period" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DocumentReview" ADD COLUMN     "content" TEXT NOT NULL;
