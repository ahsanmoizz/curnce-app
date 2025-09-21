-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "apiSecret" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'active';
