/*
  Warnings:

  - Added the required column `amount` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "amount" DECIMAL(36,18) NOT NULL,
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'INR';
