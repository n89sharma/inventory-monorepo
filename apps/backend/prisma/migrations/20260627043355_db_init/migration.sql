-- MANUALLY ADDED
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- MANUALLY ADDED
CREATE SEQUENCE IF NOT EXISTS seq_asset     START 1;
CREATE SEQUENCE IF NOT EXISTS seq_arrival   START 1;
CREATE SEQUENCE IF NOT EXISTS seq_departure START 1;
CREATE SEQUENCE IF NOT EXISTS seq_transfer  START 1;
CREATE SEQUENCE IF NOT EXISTS seq_hold      START 1;
CREATE SEQUENCE IF NOT EXISTS seq_invoice   START 1;
CREATE SEQUENCE IF NOT EXISTS seq_store_transaction   START 1;

-- CreateTable
CREATE TABLE "Accessory" (
    "id" SERIAL NOT NULL,
    "accessory" TEXT NOT NULL,

    CONSTRAINT "Accessory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetType" (
    "id" SERIAL NOT NULL,
    "asset_type" TEXT NOT NULL,

    CONSTRAINT "AssetType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Status" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Readiness" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,

    CONSTRAINT "Readiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FileType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "FileType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,

    CONSTRAINT "InvoiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" SERIAL NOT NULL,
    "barcode" VARCHAR(50) NOT NULL,
    "serial_number" VARCHAR(50) NOT NULL,
    "model_id" INTEGER NOT NULL,
    "location_id" INTEGER,
    "status_id" INTEGER NOT NULL,
    "readiness_id" INTEGER NOT NULL,
    "purchase_invoice_id" INTEGER,
    "sales_invoice_id" INTEGER,
    "arrival_id" INTEGER,
    "departure_id" INTEGER,
    "hold_id" INTEGER,
    "country_of_origin_id" INTEGER,
    "manufactured_year" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL,
    "is_in_transit" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- MANUALLY ADDED
ALTER TABLE "Asset"
  ADD COLUMN barcode_normalized TEXT GENERATED ALWAYS AS
    (lower(regexp_replace(barcode, '[^a-zA-Z0-9]', '', 'g'))) STORED,
  ADD COLUMN serial_normalized TEXT GENERATED ALWAYS AS
    (lower(regexp_replace(serial_number, '[^a-zA-Z0-9]', '', 'g'))) STORED;

-- MANUALLY ADDED
CREATE INDEX idx_asset_barcode_norm_trgm ON "Asset" USING GIN (barcode_normalized gin_trgm_ops);
CREATE INDEX idx_asset_serial_norm_trgm  ON "Asset" USING GIN (serial_normalized  gin_trgm_ops);

-- CreateTable
CREATE TABLE "TechnicalSpecification" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "cassettes" INTEGER,
    "meter_black" INTEGER,
    "meter_colour" INTEGER,
    "meter_total" INTEGER,
    "drum_life_c" INTEGER,
    "drum_life_m" INTEGER,
    "drum_life_y" INTEGER,
    "drum_life_k" INTEGER,
    "toner_life_c" INTEGER,
    "toner_life_m" INTEGER,
    "toner_life_y" INTEGER,
    "toner_life_k" INTEGER,
    "component_id" INTEGER,

    CONSTRAINT "TechnicalSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cost" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "purchase_cost" DECIMAL(12,2),
    "transport_cost" DECIMAL(12,2),
    "processing_cost" DECIMAL(12,2),
    "other_cost" DECIMAL(12,2),
    "parts_cost" DECIMAL(12,2),
    "total_cost" DECIMAL(12,2),
    "sale_price" DECIMAL(12,2),

    CONSTRAINT "Cost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetAccessory" (
    "asset_id" INTEGER NOT NULL,
    "accessory_id" INTEGER NOT NULL,

    CONSTRAINT "AssetAccessory_pkey" PRIMARY KEY ("asset_id","accessory_id")
);

-- CreateTable
CREATE TABLE "Error" (
    "id" SERIAL NOT NULL,
    "brand_id" INTEGER NOT NULL,
    "code" VARCHAR(15) NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,

    CONSTRAINT "Error_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetError" (
    "asset_id" INTEGER NOT NULL,
    "error_id" INTEGER NOT NULL,
    "is_fixed" BOOLEAN NOT NULL,
    "added_by" INTEGER,
    "added_at" TIMESTAMP(3),
    "fixed_by" INTEGER,
    "fixed_at" TIMESTAMP(3),

    CONSTRAINT "AssetError_pkey" PRIMARY KEY ("asset_id","error_id")
);

-- CreateTable
CREATE TABLE "StorePart" (
    "id" SERIAL NOT NULL,
    "part_number" VARCHAR(50) NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "StorePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTransactionType" (
    "id" SERIAL NOT NULL,
    "type" TEXT NOT NULL,
    "is_inbound" BOOLEAN NOT NULL,

    CONSTRAINT "StoreTransactionType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreTransaction" (
    "id" SERIAL NOT NULL,
    "store_transaction_number" VARCHAR(50) NOT NULL,
    "store_part_id" INTEGER NOT NULL,
    "transaction_type_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "departure_id" INTEGER,
    "warehouse_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "StoreTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetStorePart" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "store_part_id" INTEGER NOT NULL,
    "store_transaction_id" INTEGER NOT NULL,
    "estimated_cost" DECIMAL(12,2) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetStorePart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSalvagedPart" (
    "id" SERIAL NOT NULL,
    "recipient_asset_id" INTEGER NOT NULL,
    "donor_asset_id" INTEGER NOT NULL,
    "fixed_at" TIMESTAMP(3) NOT NULL,
    "fixed_by" INTEGER NOT NULL,
    "is_exchange" BOOLEAN NOT NULL,
    "part" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "AssetSalvagedPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" SERIAL NOT NULL,
    "transfer_number" VARCHAR(50) NOT NULL,
    "origin_id" INTEGER NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "transporter_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetTransfer" (
    "asset_id" INTEGER NOT NULL,
    "transfer_id" INTEGER NOT NULL,

    CONSTRAINT "AssetTransfer_pkey" PRIMARY KEY ("asset_id","transfer_id")
);

-- CreateTable
CREATE TABLE "Arrival" (
    "id" SERIAL NOT NULL,
    "arrival_number" VARCHAR(50) NOT NULL,
    "origin_id" INTEGER NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "transporter_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Arrival_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departure" (
    "id" SERIAL NOT NULL,
    "departure_number" VARCHAR(50) NOT NULL,
    "origin_id" INTEGER NOT NULL,
    "destination_id" INTEGER NOT NULL,
    "transporter_id" INTEGER NOT NULL,
    "created_by_id" INTEGER,
    "sales_representative_id" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hold" (
    "id" SERIAL NOT NULL,
    "hold_number" VARCHAR(50) NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_for_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "from_dt" TIMESTAMP(3),
    "to_dt" TIMESTAMP(3),
    "archived_at" TIMESTAMP(3),

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" SERIAL NOT NULL,
    "invoice_number" VARCHAR(50) NOT NULL,
    "invoice_reference" TEXT NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "updated_by_id" INTEGER NOT NULL,
    "is_cleared" BOOLEAN NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "invoice_type_id" INTEGER NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" SERIAL NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "zone_id" INTEGER NOT NULL,
    "bin" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" SERIAL NOT NULL,
    "zone" TEXT NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "city_code" CHAR(3) NOT NULL,
    "street" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Model" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "size" DOUBLE PRECISION NOT NULL,
    "is_colour" BOOLEAN NOT NULL DEFAULT false,
    "brand_id" INTEGER NOT NULL,
    "asset_type_id" INTEGER NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Component" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand_id" INTEGER NOT NULL,

    CONSTRAINT "Component_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "uploaded_by_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "data" BYTEA NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL,
    "file_type_id" INTEGER NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" SERIAL NOT NULL,
    "asset_id" INTEGER NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "clerk_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "default_warehouse_id" INTEGER,
    "role" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "page_key" VARCHAR(40) NOT NULL,
    "query_string" TEXT NOT NULL,
    "created_by_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" SERIAL NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "name" TEXT NOT NULL,
    "contact_name" TEXT,
    "phone" TEXT,
    "phone_ext" TEXT,
    "mobile" TEXT,
    "primary_email" TEXT,
    "secondary_email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "province" TEXT,
    "country" TEXT,
    "website" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "changed_on" TIMESTAMP(3) NOT NULL,
    "changes" JSONB NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" INTEGER NOT NULL,
    "action_type" TEXT NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Accessory_accessory_key" ON "Accessory"("accessory");

-- CreateIndex
CREATE UNIQUE INDEX "AssetType_asset_type_key" ON "AssetType"("asset_type");

-- CreateIndex
CREATE UNIQUE INDEX "Status_status_key" ON "Status"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Readiness_status_key" ON "Readiness"("status");

-- CreateIndex
CREATE UNIQUE INDEX "FileType_type_key" ON "FileType"("type");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceType_type_key" ON "InvoiceType"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_barcode_key" ON "Asset"("barcode");

-- CreateIndex
CREATE INDEX "Asset_barcode_normalized_idx" ON "Asset" USING GIN ("barcode_normalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Asset_serial_normalized_idx" ON "Asset" USING GIN ("serial_normalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Asset_serial_number_idx" ON "Asset"("serial_number");

-- CreateIndex
CREATE INDEX "Asset_model_id_idx" ON "Asset"("model_id");

-- CreateIndex
CREATE INDEX "Asset_location_id_idx" ON "Asset"("location_id");

-- CreateIndex
CREATE INDEX "Asset_status_id_idx" ON "Asset"("status_id");

-- CreateIndex
CREATE INDEX "Asset_readiness_id_idx" ON "Asset"("readiness_id");

-- CreateIndex
CREATE INDEX "Asset_arrival_id_idx" ON "Asset"("arrival_id");

-- CreateIndex
CREATE INDEX "Asset_departure_id_idx" ON "Asset"("departure_id");

-- CreateIndex
CREATE INDEX "Asset_hold_id_idx" ON "Asset"("hold_id");

-- CreateIndex
CREATE INDEX "Asset_purchase_invoice_id_idx" ON "Asset"("purchase_invoice_id");

-- CreateIndex
CREATE INDEX "Asset_sales_invoice_id_idx" ON "Asset"("sales_invoice_id");

-- CreateIndex
CREATE INDEX "Asset_created_at_idx" ON "Asset"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalSpecification_asset_id_key" ON "TechnicalSpecification"("asset_id");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_meter_black_idx" ON "TechnicalSpecification"("meter_black");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_meter_colour_idx" ON "TechnicalSpecification"("meter_colour");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_meter_total_idx" ON "TechnicalSpecification"("meter_total");

-- CreateIndex
CREATE INDEX "TechnicalSpecification_component_id_idx" ON "TechnicalSpecification"("component_id");

-- CreateIndex
CREATE UNIQUE INDEX "Cost_asset_id_key" ON "Cost"("asset_id");

-- CreateIndex
CREATE INDEX "Cost_purchase_cost_idx" ON "Cost"("purchase_cost");

-- CreateIndex
CREATE INDEX "Cost_transport_cost_idx" ON "Cost"("transport_cost");

-- CreateIndex
CREATE INDEX "Cost_processing_cost_idx" ON "Cost"("processing_cost");

-- CreateIndex
CREATE INDEX "Cost_other_cost_idx" ON "Cost"("other_cost");

-- CreateIndex
CREATE INDEX "Cost_parts_cost_idx" ON "Cost"("parts_cost");

-- CreateIndex
CREATE INDEX "Cost_total_cost_idx" ON "Cost"("total_cost");

-- CreateIndex
CREATE INDEX "Cost_sale_price_idx" ON "Cost"("sale_price");

-- CreateIndex
CREATE INDEX "Error_code_idx" ON "Error"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Error_brand_id_code_key" ON "Error"("brand_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "StorePart_part_number_key" ON "StorePart"("part_number");

-- CreateIndex
CREATE UNIQUE INDEX "StoreTransactionType_type_key" ON "StoreTransactionType"("type");

-- CreateIndex
CREATE UNIQUE INDEX "StoreTransaction_store_transaction_number_key" ON "StoreTransaction"("store_transaction_number");

-- CreateIndex
CREATE INDEX "StoreTransaction_store_part_id_created_at_idx" ON "StoreTransaction"("store_part_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "StoreTransaction_transaction_type_id_idx" ON "StoreTransaction"("transaction_type_id");

-- CreateIndex
CREATE INDEX "StoreTransaction_departure_id_idx" ON "StoreTransaction"("departure_id");

-- CreateIndex
CREATE INDEX "StoreTransaction_created_by_id_idx" ON "StoreTransaction"("created_by_id");

-- CreateIndex
CREATE INDEX "StoreTransaction_created_at_idx" ON "StoreTransaction"("created_at" DESC);

-- CreateIndex
CREATE INDEX "AssetStorePart_asset_id_idx" ON "AssetStorePart"("asset_id");

-- CreateIndex
CREATE INDEX "AssetStorePart_store_part_id_idx" ON "AssetStorePart"("store_part_id");

-- CreateIndex
CREATE INDEX "AssetStorePart_store_transaction_id_idx" ON "AssetStorePart"("store_transaction_id");

-- CreateIndex
CREATE INDEX "AssetStorePart_created_by_id_idx" ON "AssetStorePart"("created_by_id");

-- CreateIndex
CREATE INDEX "AssetSalvagedPart_recipient_asset_id_idx" ON "AssetSalvagedPart"("recipient_asset_id");

-- CreateIndex
CREATE INDEX "AssetSalvagedPart_donor_asset_id_idx" ON "AssetSalvagedPart"("donor_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transfer_transfer_number_key" ON "Transfer"("transfer_number");

-- CreateIndex
CREATE INDEX "Transfer_created_at_idx" ON "Transfer"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Transfer_origin_id_destination_id_idx" ON "Transfer"("origin_id", "destination_id");

-- CreateIndex
CREATE INDEX "Transfer_destination_id_idx" ON "Transfer"("destination_id");

-- CreateIndex
CREATE INDEX "Transfer_transporter_id_idx" ON "Transfer"("transporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "Arrival_arrival_number_key" ON "Arrival"("arrival_number");

-- CreateIndex
CREATE INDEX "Arrival_destination_id_created_at_idx" ON "Arrival"("destination_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Arrival_created_at_idx" ON "Arrival"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Arrival_origin_id_idx" ON "Arrival"("origin_id");

-- CreateIndex
CREATE INDEX "Arrival_destination_id_idx" ON "Arrival"("destination_id");

-- CreateIndex
CREATE INDEX "Arrival_transporter_id_idx" ON "Arrival"("transporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "Departure_departure_number_key" ON "Departure"("departure_number");

-- CreateIndex
CREATE INDEX "Departure_origin_id_created_at_idx" ON "Departure"("origin_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Departure_created_at_idx" ON "Departure"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Departure_origin_id_idx" ON "Departure"("origin_id");

-- CreateIndex
CREATE INDEX "Departure_destination_id_idx" ON "Departure"("destination_id");

-- CreateIndex
CREATE INDEX "Departure_transporter_id_idx" ON "Departure"("transporter_id");

-- CreateIndex
CREATE UNIQUE INDEX "Hold_hold_number_key" ON "Hold"("hold_number");

-- CreateIndex
CREATE INDEX "Hold_created_at_idx" ON "Hold"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Hold_created_for_id_customer_id_idx" ON "Hold"("created_for_id", "customer_id");

-- CreateIndex
CREATE INDEX "Hold_created_by_id_idx" ON "Hold"("created_by_id");

-- CreateIndex
CREATE INDEX "Hold_customer_id_idx" ON "Hold"("customer_id");

-- CreateIndex
CREATE INDEX "Hold_from_dt_idx" ON "Hold"("from_dt");

-- CreateIndex
CREATE INDEX "Hold_to_dt_idx" ON "Hold"("to_dt");

-- CreateIndex
CREATE INDEX "Hold_archived_at_idx" ON "Hold"("archived_at");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoice_number_key" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE INDEX "Invoice_created_at_idx" ON "Invoice"("created_at" DESC);

-- CreateIndex
CREATE INDEX "Invoice_invoice_type_id_idx" ON "Invoice"("invoice_type_id");

-- CreateIndex
CREATE INDEX "Invoice_invoice_number_idx" ON "Invoice"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "Location_warehouse_id_zone_id_bin_key" ON "Location"("warehouse_id", "zone_id", "bin");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_zone_key" ON "Zone"("zone");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_city_code_street_key" ON "Warehouse"("city_code", "street");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE INDEX "Model_name_idx" ON "Model"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Model_brand_id_name_key" ON "Model"("brand_id", "name");

-- CreateIndex
CREATE INDEX "Component_name_idx" ON "Component"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Component_brand_id_name_key" ON "Component"("brand_id", "name");

-- CreateIndex
CREATE INDEX "File_asset_id_uploaded_at_idx" ON "File"("asset_id", "uploaded_at" DESC);

-- CreateIndex
CREATE INDEX "File_uploaded_by_id_idx" ON "File"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "File_name_idx" ON "File"("name");

-- CreateIndex
CREATE INDEX "Comment_asset_id_created_at_idx" ON "Comment"("asset_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "Comment_created_by_id_idx" ON "Comment"("created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_name_key" ON "User"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_clerk_id_key" ON "User"("clerk_id");

-- CreateIndex
CREATE INDEX "SavedView_created_by_id_page_key_idx" ON "SavedView"("created_by_id", "page_key");

-- CreateIndex
CREATE UNIQUE INDEX "SavedView_created_by_id_page_key_name_key" ON "SavedView"("created_by_id", "page_key", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_account_number_key" ON "Organization"("account_number");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "History_entity_type_entity_id_changed_on_idx" ON "History"("entity_type", "entity_id", "changed_on" DESC);

-- CreateIndex
CREATE INDEX "History_user_id_changed_on_idx" ON "History"("user_id", "changed_on" DESC);

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "Model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_purchase_invoice_id_fkey" FOREIGN KEY ("purchase_invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_sales_invoice_id_fkey" FOREIGN KEY ("sales_invoice_id") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_arrival_id_fkey" FOREIGN KEY ("arrival_id") REFERENCES "Arrival"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "Departure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_hold_id_fkey" FOREIGN KEY ("hold_id") REFERENCES "Hold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_status_id_fkey" FOREIGN KEY ("status_id") REFERENCES "Status"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_readiness_id_fkey" FOREIGN KEY ("readiness_id") REFERENCES "Readiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_country_of_origin_id_fkey" FOREIGN KEY ("country_of_origin_id") REFERENCES "Country"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSpecification" ADD CONSTRAINT "TechnicalSpecification_component_id_fkey" FOREIGN KEY ("component_id") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalSpecification" ADD CONSTRAINT "TechnicalSpecification_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cost" ADD CONSTRAINT "Cost_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAccessory" ADD CONSTRAINT "AssetAccessory_accessory_id_fkey" FOREIGN KEY ("accessory_id") REFERENCES "Accessory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetAccessory" ADD CONSTRAINT "AssetAccessory_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Error" ADD CONSTRAINT "Error_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetError" ADD CONSTRAINT "AssetError_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetError" ADD CONSTRAINT "AssetError_error_id_fkey" FOREIGN KEY ("error_id") REFERENCES "Error"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetError" ADD CONSTRAINT "AssetError_added_by_fkey" FOREIGN KEY ("added_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetError" ADD CONSTRAINT "AssetError_fixed_by_fkey" FOREIGN KEY ("fixed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTransaction" ADD CONSTRAINT "StoreTransaction_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTransaction" ADD CONSTRAINT "StoreTransaction_store_part_id_fkey" FOREIGN KEY ("store_part_id") REFERENCES "StorePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTransaction" ADD CONSTRAINT "StoreTransaction_transaction_type_id_fkey" FOREIGN KEY ("transaction_type_id") REFERENCES "StoreTransactionType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTransaction" ADD CONSTRAINT "StoreTransaction_departure_id_fkey" FOREIGN KEY ("departure_id") REFERENCES "Departure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreTransaction" ADD CONSTRAINT "StoreTransaction_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStorePart" ADD CONSTRAINT "AssetStorePart_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStorePart" ADD CONSTRAINT "AssetStorePart_store_part_id_fkey" FOREIGN KEY ("store_part_id") REFERENCES "StorePart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStorePart" ADD CONSTRAINT "AssetStorePart_store_transaction_id_fkey" FOREIGN KEY ("store_transaction_id") REFERENCES "StoreTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetStorePart" ADD CONSTRAINT "AssetStorePart_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSalvagedPart" ADD CONSTRAINT "AssetSalvagedPart_recipient_asset_id_fkey" FOREIGN KEY ("recipient_asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSalvagedPart" ADD CONSTRAINT "AssetSalvagedPart_donor_asset_id_fkey" FOREIGN KEY ("donor_asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSalvagedPart" ADD CONSTRAINT "AssetSalvagedPart_fixed_by_fkey" FOREIGN KEY ("fixed_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetTransfer" ADD CONSTRAINT "AssetTransfer_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrival" ADD CONSTRAINT "Arrival_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrival" ADD CONSTRAINT "Arrival_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrival" ADD CONSTRAINT "Arrival_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Arrival" ADD CONSTRAINT "Arrival_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departure" ADD CONSTRAINT "Departure_origin_id_fkey" FOREIGN KEY ("origin_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departure" ADD CONSTRAINT "Departure_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departure" ADD CONSTRAINT "Departure_transporter_id_fkey" FOREIGN KEY ("transporter_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departure" ADD CONSTRAINT "Departure_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departure" ADD CONSTRAINT "Departure_sales_representative_id_fkey" FOREIGN KEY ("sales_representative_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_created_for_id_fkey" FOREIGN KEY ("created_for_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hold" ADD CONSTRAINT "Hold_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_invoice_type_id_fkey" FOREIGN KEY ("invoice_type_id") REFERENCES "InvoiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_asset_type_id_fkey" FOREIGN KEY ("asset_type_id") REFERENCES "AssetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Model" ADD CONSTRAINT "Model_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Component" ADD CONSTRAINT "Component_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_file_type_id_fkey" FOREIGN KEY ("file_type_id") REFERENCES "FileType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_default_warehouse_id_fkey" FOREIGN KEY ("default_warehouse_id") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
