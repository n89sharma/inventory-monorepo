-- CreateTable
CREATE TABLE "Bid" (
    "id" SERIAL NOT NULL,
    "bid_number" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    "outcome" VARCHAR(10),
    "vendor_id" INTEGER NOT NULL,
    "received_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "submitted_date" DATE,
    "notes" TEXT,
    "headers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BidRow" (
    "id" SERIAL NOT NULL,
    "bid_id" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "cells" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selling_price" DECIMAL(12,2),
    "transport_cost" DECIMAL(12,2),
    "margin_percent" DECIMAL(5,2),
    "zero_priced" BOOLEAN NOT NULL DEFAULT false,
    "bid_price" DECIMAL(12,2),
    "total_cost" DECIMAL(12,2),

    CONSTRAINT "BidRow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bid_bid_number_key" ON "Bid"("bid_number");

-- CreateIndex
CREATE INDEX "Bid_received_date_idx" ON "Bid"("received_date" DESC);

-- CreateIndex
CREATE INDEX "Bid_vendor_id_idx" ON "Bid"("vendor_id");

-- CreateIndex
CREATE INDEX "BidRow_bid_id_position_idx" ON "BidRow"("bid_id", "position");

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BidRow" ADD CONSTRAINT "BidRow_bid_id_fkey" FOREIGN KEY ("bid_id") REFERENCES "Bid"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE SEQUENCE IF NOT EXISTS seq_bid START 1;

-- Purchase bids are admin-only to begin with.
INSERT INTO "Permission" ("key") VALUES ('create_update_purchase_bids');

INSERT INTO "RolePermission" ("role_code", "permission_key")
SELECT r."code", 'create_update_purchase_bids'
FROM "Role" r
WHERE r."code" IN ('admin');
