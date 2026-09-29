-- AlterTable
ALTER TABLE "Departure" ADD COLUMN     "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "AssetDeparture" (
    "asset_id" INTEGER NOT NULL,
    "departure_id" INTEGER NOT NULL,
    "outgoing_status_id" INTEGER NOT NULL,
    "loaded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssetDeparture_pkey" PRIMARY KEY ("asset_id")
);

-- CreateIndex
CREATE INDEX "AssetDeparture_departure_id_idx" ON "AssetDeparture"("departure_id");

-- AddForeignKey
ALTER TABLE "AssetDeparture" ADD CONSTRAINT "AssetDeparture_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDeparture" ADD CONSTRAINT "AssetDeparture_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "Departure"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetDeparture" ADD CONSTRAINT "AssetDeparture_outgoing_status_id_fkey" FOREIGN KEY ("outgoing_status_id") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

