/*
  Warnings:

  - Changed the type of `type` on the `Account` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Account"
ALTER COLUMN "type" TYPE TEXT
USING "type"::text;
