import { z } from 'zod'

export const MAX_MONTH_END_SCHEDULE_DAY = 28
export const MAX_MONTH_END_BULK_DELETE = 100

export const MonthEndReportKindSchema = z.enum(['SCHEDULED', 'MANUAL'])
export type MonthEndReportKind = z.infer<typeof MonthEndReportKindSchema>
export const MONTH_END_REPORT_KIND = MonthEndReportKindSchema.enum

export const BrandGroupSchema = z.enum(['CANON', 'NON_CANON'])
export type BrandGroup = z.infer<typeof BrandGroupSchema>
export const BRAND_GROUP = BrandGroupSchema.enum

export const BRAND_GROUP_LABELS = {
  CANON: 'Canon',
  NON_CANON: 'Non-Canon',
} as const satisfies Record<BrandGroup, string>

export const AssetGroupSchema = z.enum(['COPIER', 'NON_COPIER'])
export type AssetGroup = z.infer<typeof AssetGroupSchema>
export const ASSET_GROUP = AssetGroupSchema.enum

export const ASSET_GROUP_LABELS = {
  COPIER: 'Copier',
  NON_COPIER: 'Non-Copier',
} as const satisfies Record<AssetGroup, string>

export const MonthEndReportHeaderSchema = z.object({
  id: z.number().int(),
  kind: MonthEndReportKindSchema,
  period: z.string().nullable(),
  captured_at: z.coerce.date(),
  created_by: z.string().nullable(),
})
export type MonthEndReportHeader = z.infer<typeof MonthEndReportHeaderSchema>

export const MonthEndReportListItemSchema = MonthEndReportHeaderSchema.extend({
  total_cost: z.number(),
})
export type MonthEndReportListItem = z.infer<typeof MonthEndReportListItemSchema>

export const MonthEndReportListSchema = z.array(MonthEndReportListItemSchema)

export const MonthEndCostRowSchema = z.object({
  base: z.number(),
  freight: z.number(),
  base_freight: z.number(),
  total: z.number(),
})
export type MonthEndCostRow = z.infer<typeof MonthEndCostRowSchema>

// parts_value is null when a brand or asset-type filter excludes parts (StorePart has neither)
const MonthEndSummaryTableSchema = z.object({
  on_hand: MonthEndCostRowSchema,
  in_transit: MonthEndCostRowSchema,
  parts_value: z.number().nullable(),
  total: MonthEndCostRowSchema,
})

const MonthEndWarehouseSummarySchema = MonthEndSummaryTableSchema.extend({
  warehouse_id: z.number().int(),
  city_code: z.string(),
})
export type MonthEndWarehouseSummary = z.infer<typeof MonthEndWarehouseSummarySchema>

const MonthEndSummarySchema = z.object({
  warehouses: z.array(MonthEndWarehouseSummarySchema),
  company: MonthEndSummaryTableSchema,
})
export type MonthEndSummary = z.infer<typeof MonthEndSummarySchema>
export type MonthEndSummaryTable = MonthEndSummary['company']

export const MonthEndReportAssetLineSchema = z.object({
  id: z.number().int(),
  warehouse_id: z.number().int(),
  city_code: z.string(),
  is_in_transit: z.boolean(),
  brand_group: BrandGroupSchema,
  barcode: z.string(),
  brand_name: z.string(),
  model_name: z.string(),
  asset_type: z.string(),
  serial_number: z.string(),
  meter_total: z.number().int().nullable(),
  purchase_cost: z.number().nullable(),
  transport_cost: z.number().nullable(),
  transfer_cost: z.number().nullable(),
  processing_cost: z.number().nullable(),
  other_cost: z.number().nullable(),
  parts_cost: z.number().nullable(),
  total_cost: z.number().nullable(),
  stock_date: z.coerce.date().nullable(),
  stock_days: z.number().int().nullable(),
  vendor_name: z.string().nullable(),
  accessories: z.array(z.string()),
  cassettes: z.number().int().nullable(),
  readiness: z.string(),
  status: z.string(),
  hold_number: z.string().nullable(),
  arrival_number: z.string().nullable(),
  purchase_invoice_number: z.string().nullable(),
  transfer_number: z.string().nullable(),
})
export type MonthEndReportAssetLine = z.infer<typeof MonthEndReportAssetLineSchema>

export const MonthEndReportDetailSchema = z.object({
  header: MonthEndReportHeaderSchema,
  summary: MonthEndSummarySchema,
  assets: z.array(MonthEndReportAssetLineSchema),
})
export type MonthEndReportDetail = z.infer<typeof MonthEndReportDetailSchema>

export const CreateMonthEndReportResultSchema = z.object({ id: z.number().int() })

export const DeleteMonthEndReportsSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(MAX_MONTH_END_BULK_DELETE),
})
export type DeleteMonthEndReports = z.infer<typeof DeleteMonthEndReportsSchema>

// day_of_month null = last day of the month
export const UpdateMonthEndScheduleSchema = z.object({
  day_of_month: z.number().int().min(1).max(MAX_MONTH_END_SCHEDULE_DAY).nullable(),
})
export type UpdateMonthEndSchedule = z.infer<typeof UpdateMonthEndScheduleSchema>

export const MonthEndScheduleSchema = UpdateMonthEndScheduleSchema.extend({
  next_run_at: z.coerce.date().nullable(),
})
export type MonthEndSchedule = z.infer<typeof MonthEndScheduleSchema>
