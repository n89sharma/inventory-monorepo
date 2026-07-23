-- AlterTable
ALTER TABLE "Invoice"
  ADD COLUMN "invoice_reference_normalized" TEXT GENERATED ALWAYS AS
    (lower(regexp_replace(invoice_reference, '[^a-zA-Z0-9]', '', 'g'))) STORED;

-- CreateIndex
CREATE INDEX "Invoice_invoice_reference_normalized_idx" ON "Invoice" USING GIN ("invoice_reference_normalized" gin_trgm_ops);