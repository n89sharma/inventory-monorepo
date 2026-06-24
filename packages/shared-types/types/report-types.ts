import { z } from 'zod'

const DEFAULT_REPORT_VARIANT = 'general_report'
const MAX_EXPORT_BARCODES = 2000

export const REPORT_VARIANT_VALUES = [
  'general_report',
  'arrival_report',
  'transfer_report',
  'departure_report',
  'invoice_report',
  'hold_report',
] as const

export const ReportVariantSchema = z.enum(REPORT_VARIANT_VALUES)
export type ReportVariant = z.infer<typeof ReportVariantSchema>

const MAX_EXPORT_COLUMNS = 64
const MAX_COLUMN_KEY_LENGTH = 64

export const ExportAssetsSchema = z.object({
  barcodes: z.array(z.string()).min(1).max(MAX_EXPORT_BARCODES),
  variant: ReportVariantSchema.default(DEFAULT_REPORT_VARIANT),
  columnKeys: z
    .array(z.string().max(MAX_COLUMN_KEY_LENGTH))
    .min(1)
    .max(MAX_EXPORT_COLUMNS)
    .optional(),
})

export type ExportAssets = z.infer<typeof ExportAssetsSchema>

export const PrintBarcodesSchema = z.object({
  barcodes: z.array(z.string()).min(1).max(MAX_EXPORT_BARCODES),
})

export type PrintBarcodes = z.infer<typeof PrintBarcodesSchema>
