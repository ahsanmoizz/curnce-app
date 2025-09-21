/*
  Warnings:

  - You are about to drop the column `trialEndsAt` on the `Company` table. All the data in the column will be lost.
  - You are about to drop the column `companyId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `stripeSubId` on the `Subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paypalSubId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenantId` to the `Subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_companyId_fkey";

-- DropIndex
DROP INDEX "Subscription_stripeSubId_key";

-- AlterTable
ALTER TABLE "Company" DROP COLUMN "trialEndsAt";

-- AlterTable
ALTER TABLE "Subscription" DROP COLUMN "companyId",
DROP COLUMN "stripeSubId",
ADD COLUMN     "paypalSubId" TEXT,
ADD COLUMN     "tenantId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "trialEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paypalSubId_key" ON "Subscription"("paypalSubId");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
