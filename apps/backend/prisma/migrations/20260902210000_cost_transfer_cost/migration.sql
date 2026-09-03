-- AlterTable
ALTER TABLE "Cost" ADD COLUMN     "transfer_cost" DECIMAL(12,2);

-- CreateIndex
CREATE INDEX "Cost_transfer_cost_idx" ON "Cost"("transfer_cost");
