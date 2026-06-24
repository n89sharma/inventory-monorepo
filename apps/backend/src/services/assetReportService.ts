import { type AppRole, type ReportVariant } from 'shared-types'
import { getAssetDetailsBatch as getAssetDetailsBatchQuery } from '../../generated/prisma/sql.js'
import { mapAssetDetail } from '../lib/asset-mappers.js'
import { prisma } from '../prisma.js'
import { REPORT_VARIANTS } from '../reporting/report-variants.js'
import { generateCsvReport } from './reportService.js'

export async function exportAssetReport(
  barcodes: string[],
  role: AppRole | null,
  variant: ReportVariant,
  columnKeys?: string[],
): Promise<string> {
  const results = await prisma.$queryRawTyped(getAssetDetailsBatchQuery(barcodes))
  const details = results.map((r) => mapAssetDetail(r))
  const columns = columnKeys ?? REPORT_VARIANTS[variant]
  return generateCsvReport(columns, details, role)
}
