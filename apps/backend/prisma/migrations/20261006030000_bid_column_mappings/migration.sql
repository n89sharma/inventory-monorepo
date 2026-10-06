-- CreateTable
CREATE TABLE "BidColumnMapping" (
    "id" SERIAL NOT NULL,
    "bid_id" INTEGER NOT NULL,
    "column_index" INTEGER NOT NULL,
    "role" VARCHAR(30) NOT NULL,

    CONSTRAINT "BidColumnMapping_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BidColumnMapping_bid_id_role_key" ON "BidColumnMapping"("bid_id", "role");

-- CreateIndex
CREATE UNIQUE INDEX "BidColumnMapping_bid_id_column_index_key" ON "BidColumnMapping"("bid_id", "column_index");

-- AddForeignKey
ALTER TABLE "BidColumnMapping" ADD CONSTRAINT "BidColumnMapping_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
