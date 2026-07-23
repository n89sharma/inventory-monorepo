-- AlterTable: add invoice_date (backfilled from created_at), give created_at a default
ALTER TABLE "Invoice" ADD COLUMN "invoice_date" DATE;

UPDATE "Invoice" SET "invoice_date" = "created_at"::date;

ALTER TABLE "Invoice" ALTER COLUMN "invoice_date" SET NOT NULL;

ALTER TABLE "Invoice" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Invoice_invoice_date_idx" ON "Invoice"("invoice_date" DESC);
