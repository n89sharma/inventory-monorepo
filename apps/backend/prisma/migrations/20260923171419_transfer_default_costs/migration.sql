-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "other_cost" DECIMAL(12,2),
ADD COLUMN     "processing_cost" DECIMAL(12,2),
ADD COLUMN     "transfer_cost" DECIMAL(12,2);

-- CreateTable
CREATE TABLE "WarehouseTransferCost" (
    "warehouse_id" INTEGER NOT NULL,
    "transfer_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "processing_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "other_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "updated_by_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseTransferCost_pkey" PRIMARY KEY ("warehouse_id")
);

-- CreateIndex
CREATE INDEX "WarehouseTransferCost_updated_by_id_idx" ON "WarehouseTransferCost"("updated_by_id");

-- AddForeignKey
ALTER TABLE "WarehouseTransferCost" ADD CONSTRAINT "WarehouseTransferCost_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseTransferCost" ADD CONSTRAINT "WarehouseTransferCost_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
