-- AlterTable
ALTER TABLE "PaymentIntent" ADD COLUMN     "gasPrice" DECIMAL(36,18),
ADD COLUMN     "gasUsed" DECIMAL(36,18),
ADD COLUMN     "onchainTxHash" TEXT;

-- CreateIndex
CREATE INDEX "OnchainLedgerLink_ledgerEntryId_idx" ON "OnchainLedgerLink"("ledgerEntryId");

-- CreateIndex
CREATE INDEX "OnchainLedgerLink_onchainEventId_idx" ON "OnchainLedgerLink"("onchainEventId");
