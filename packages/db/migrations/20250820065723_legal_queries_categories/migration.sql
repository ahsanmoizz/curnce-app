/*
  Warnings:

  - Added the required column `category` to the `LegalQuery` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "LegalQuery" ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "explanation" TEXT;

-- CreateIndex
CREATE INDEX "LegalQuery_tenantId_category_idx" ON "LegalQuery"("tenantId", "category");
