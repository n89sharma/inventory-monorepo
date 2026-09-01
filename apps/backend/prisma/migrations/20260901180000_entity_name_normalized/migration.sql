-- `+` is deliberately preserved: it carries meaning in a model name, so
-- IMAGEPRESS-C1 and IMAGEPRESS-C1+ must stay distinct models.

-- AlterTable
ALTER TABLE "Brand"
  ADD COLUMN "name_normalized" TEXT GENERATED ALWAYS AS
    (lower(regexp_replace(name, '[^a-zA-Z0-9+]', '', 'g'))) STORED;

ALTER TABLE "Model"
  ADD COLUMN "name_normalized" TEXT GENERATED ALWAYS AS
    (lower(regexp_replace(name, '[^a-zA-Z0-9+]', '', 'g'))) STORED;

ALTER TABLE "Organization"
  ADD COLUMN "name_normalized" TEXT GENERATED ALWAYS AS
    (lower(regexp_replace(name, '[^a-zA-Z0-9+]', '', 'g'))) STORED;

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_normalized_key" ON "Brand"("name_normalized");
CREATE UNIQUE INDEX "Model_brand_id_name_normalized_key" ON "Model"("brand_id", "name_normalized");
CREATE UNIQUE INDEX "Organization_name_normalized_key" ON "Organization"("name_normalized");
