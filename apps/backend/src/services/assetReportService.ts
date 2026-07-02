import { type AppRole, type ReportVariant } from 'shared-types'
import { REPORT_VARIANTS } from '../reporting/report-variants.js'
import { getAssetDetailsBatch } from './assetReadService.js'
import { generateCsvReport } from './reportService.js'

export async function exportAssetReport(
  barcodes: string[],
  role: AppRole | null,
  variant: ReportVariant,
  columnKeys?: string[],
): Promise<string> {
  const details = await getAssetDetailsBatch(barcodes)
  const columns = columnKeys ?? REPORT_VARIANTS[variant]
  return generateCsvReport(columns, details, role)
}
