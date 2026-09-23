-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "tested_processing_cost" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "WarehouseTransferCost" ADD COLUMN     "tested_processing_cost" DECIMAL(12,2) NOT NULL DEFAULT 0;
