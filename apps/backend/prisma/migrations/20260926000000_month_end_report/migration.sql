-- Month-end inventory valuation snapshots. A report freezes every on-hand and in-transit asset
-- (and each warehouse's FIFO parts value) at capture time; MonthEndSchedule holds the single
-- app-wide capture day (NULL = last day of the month).

-- CreateTable
CREATE TABLE "MonthEndSchedule" (
    "id" SERIAL NOT NULL,
    "day_of_month" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by_id" INTEGER,

    CONSTRAINT "MonthEndSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthEndReport" (
    "id" SERIAL NOT NULL,
    "kind" VARCHAR(20) NOT NULL,
    "period" VARCHAR(7),
    "captured_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" INTEGER,

    CONSTRAINT "MonthEndReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthEndReportAsset" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "city_code" CHAR(3) NOT NULL,
    "is_in_transit" BOOLEAN NOT NULL,
    "brand_group" VARCHAR(20) NOT NULL,
    "barcode" VARCHAR(50) NOT NULL,
    "brand_name" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "asset_type" TEXT NOT NULL,
    "serial_number" VARCHAR(50) NOT NULL,
    "meter_total" INTEGER,
    "purchase_cost" DECIMAL(12,2),
    "transport_cost" DECIMAL(12,2),
    "transfer_cost" DECIMAL(12,2),
    "processing_cost" DECIMAL(12,2),
    "other_cost" DECIMAL(12,2),
    "parts_cost" DECIMAL(12,2),
    "total_cost" DECIMAL(12,2),
    "stock_date" TIMESTAMP(3),
    "vendor_name" TEXT,
    "accessories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cassettes" INTEGER,
    "readiness" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "hold_number" VARCHAR(50),
    "arrival_number" VARCHAR(50),
    "purchase_invoice_number" VARCHAR(50),
    "transfer_number" VARCHAR(50),

    CONSTRAINT "MonthEndReportAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthEndReportPart" (
    "id" SERIAL NOT NULL,
    "report_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "city_code" CHAR(3) NOT NULL,
    "stock_value" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "MonthEndReportPart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MonthEndReport_captured_at_idx" ON "MonthEndReport"("captured_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "MonthEndReport_kind_period_key" ON "MonthEndReport"("kind", "period");

-- CreateIndex
CREATE INDEX "MonthEndReportAsset_report_id_warehouse_id_idx" ON "MonthEndReportAsset"("report_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "MonthEndReportPart_report_id_warehouse_id_key" ON "MonthEndReportPart"("report_id", "warehouse_id");

-- AddForeignKey
ALTER TABLE "MonthEndSchedule" ADD CONSTRAINT "MonthEndSchedule_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthEndReport" ADD CONSTRAINT "MonthEndReport_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthEndReportAsset" ADD CONSTRAINT "MonthEndReportAsset_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "MonthEndReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthEndReportAsset" ADD CONSTRAINT "MonthEndReportAsset_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthEndReportPart" ADD CONSTRAINT "MonthEndReportPart_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "MonthEndReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthEndReportPart" ADD CONSTRAINT "MonthEndReportPart_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the schedule row: last day of the month.
INSERT INTO "MonthEndSchedule" ("day_of_month") VALUES (NULL);

INSERT INTO "Permission" ("key") VALUES
    ('view_month_end_report'),
    ('generate_month_end_report'),
    ('delete_month_end_report');

-- The join skips a role that has been removed in a given environment.
INSERT INTO "RolePermission" ("role_code", "permission_key")
SELECT r."code", p."key"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE r."code" IN ('admin', 'leadership')
  AND p."key" IN ('view_month_end_report', 'generate_month_end_report', 'delete_month_end_report');
