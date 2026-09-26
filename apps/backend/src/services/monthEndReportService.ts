import { differenceInCalendarDays } from 'date-fns'
import {
  ASSET_GROUP,
  BrandGroupSchema,
  MONTH_END_REPORT_KIND,
  MonthEndReportKindSchema,
  ON_HAND_STATUS_VALUES,
  type AssetGroup,
  type BrandGroup,
  type MonthEndReportAssetLine,
  type MonthEndReportDetail,
  type MonthEndReportKind,
  type MonthEndReportListItem,
} from 'shared-types'
import { Prisma } from '../../generated/prisma/client.js'
import {
  getMonthEndAssets,
  getMonthEndReports as getMonthEndReportsDb,
} from '../../generated/prisma/sql.js'
import { decimalToNumber } from '../lib/decimal.js'
import { NotFoundError } from '../lib/errors.js'
import { logger } from '../lib/logger.js'
import { brandGroupOf } from '../lib/month-end-schedule.js'
import { buildMonthEndSummary } from '../lib/month-end-summary.js'
import { prisma } from '../prisma.js'
import { getStoreValueByWarehouse } from './storePartService.js'

const CAPTURE_TIMEOUT_MS = 120_000
const CAPTURE_MAX_WAIT_MS = 10_000

interface CaptureMonthEndReportInput {
  kind: MonthEndReportKind
  period: string | null
  userId: number | null
}

const COPIER_ASSET_TYPE = 'COPIER'

interface MonthEndReportFilters {
  brandGroup: BrandGroup | undefined
  assetGroup: AssetGroup | undefined
  warehouseIds: number[]
}

function assetTypeFilterOf(assetGroup: AssetGroup | undefined): Prisma.StringFilter | undefined {
  if (assetGroup === ASSET_GROUP.COPIER) return { equals: COPIER_ASSET_TYPE, mode: 'insensitive' }
  if (assetGroup === ASSET_GROUP.NON_COPIER) return { not: COPIER_ASSET_TYPE, mode: 'insensitive' }
  return undefined
}

type MonthEndAssetRow = {
  warehouse_id: number | null
  city_code: string
  is_in_transit: boolean
  barcode: string
  brand_name: string
  brand_name_normalized: string | null
  model_name: string
  asset_type: string
  serial_number: string
  meter_total: number | null
  purchase_cost: Prisma.Decimal | null
  transport_cost: Prisma.Decimal | null
  transfer_cost: Prisma.Decimal | null
  processing_cost: Prisma.Decimal | null
  other_cost: Prisma.Decimal | null
  parts_cost: Prisma.Decimal | null
  total_cost: Prisma.Decimal | null
  stock_date: Date | null
  vendor_name: string | null
  accessories: string[] | null
  cassettes: number | null
  readiness: string
  status: string
  hold_number: string | null
  arrival_number: string | null
  purchase_invoice_number: string | null
  transfer_number: string | null
}

function toAssetLineData(
  reportId: number,
  { brand_name_normalized, warehouse_id, accessories, ...row }: MonthEndAssetRow,
): Prisma.MonthEndReportAssetCreateManyInput | null {
  if (warehouse_id === null) return null
  return {
    ...row,
    report_id: reportId,
    warehouse_id,
    accessories: accessories ?? [],
    brand_group: brandGroupOf(brand_name_normalized),
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

async function captureMonthEndReport({
  kind,
  period,
  userId,
}: CaptureMonthEndReportInput): Promise<number> {
  const activeWarehouses = await prisma.warehouse.findMany({
    where: { is_active: true },
    select: { id: true },
  })
  const warehouseIds = activeWarehouses.map((warehouse) => warehouse.id)

  return prisma.$transaction(
    async (tx) => {
      const assetRows: MonthEndAssetRow[] = await tx.$queryRawTyped(
        getMonthEndAssets([...ON_HAND_STATUS_VALUES], warehouseIds),
      )
      const partValues = await getStoreValueByWarehouse(tx, warehouseIds)

      const report = await tx.monthEndReport.create({
        data: { kind, period, captured_at: new Date(), created_by_id: userId },
        select: { id: true },
      })
      const assetLines = assetRows
        .map((row) => toAssetLineData(report.id, row))
        .filter((line) => line !== null)
      await tx.monthEndReportAsset.createMany({ data: assetLines })
      await tx.monthEndReportPart.createMany({
        data: partValues.map((part) => ({ ...part, report_id: report.id })),
      })
      return report.id
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
      maxWait: CAPTURE_MAX_WAIT_MS,
      timeout: CAPTURE_TIMEOUT_MS,
    },
  )
}

export async function createManualMonthEndReport(userId: number): Promise<number> {
  return captureMonthEndReport({ kind: MONTH_END_REPORT_KIND.MANUAL, period: null, userId })
}

export async function createScheduledMonthEndReport(period: string): Promise<number | null> {
  const kind = MONTH_END_REPORT_KIND.SCHEDULED
  const existing = await prisma.monthEndReport.findUnique({
    where: { kind_period: { kind, period } },
    select: { id: true },
  })
  if (existing) {
    logger.info(`[month-end] ${period} already captured as report ${existing.id}`)
    return null
  }

  try {
    return await captureMonthEndReport({ kind, period, userId: null })
  } catch (error) {
    if (!isUniqueViolation(error)) throw error
    logger.info(`[month-end] ${period} was captured concurrently`)
    return null
  }
}

export async function getMonthEndReports(): Promise<MonthEndReportListItem[]> {
  const rows = await prisma.$queryRawTyped(getMonthEndReportsDb())
  return rows.map((row) => ({
    ...row,
    kind: MonthEndReportKindSchema.parse(row.kind),
    total_cost: row.total_cost ?? 0,
  }))
}

export async function getMonthEndReport(
  id: number,
  { brandGroup, assetGroup, warehouseIds }: MonthEndReportFilters,
): Promise<MonthEndReportDetail> {
  const report = await prisma.monthEndReport.findUnique({
    where: { id },
    select: {
      id: true,
      kind: true,
      period: true,
      captured_at: true,
      created_by: { select: { name: true } },
    },
  })
  if (!report) throw new NotFoundError(`Month-end report ${id} not found`)

  const warehouseWhere = warehouseIds.length > 0 ? { warehouse_id: { in: warehouseIds } } : {}
  const [assetRows, partRows] = await Promise.all([
    prisma.monthEndReportAsset.findMany({
      where: {
        report_id: id,
        brand_group: brandGroup,
        asset_type: assetTypeFilterOf(assetGroup),
        ...warehouseWhere,
      },
      orderBy: [{ city_code: 'asc' }, { barcode: 'asc' }],
      omit: { report_id: true },
    }),
    prisma.monthEndReportPart.findMany({ where: { report_id: id, ...warehouseWhere } }),
  ])

  const assets: MonthEndReportAssetLine[] = assetRows.map((row) => ({
    ...row,
    brand_group: BrandGroupSchema.parse(row.brand_group),
    purchase_cost: decimalToNumber(row.purchase_cost),
    transport_cost: decimalToNumber(row.transport_cost),
    transfer_cost: decimalToNumber(row.transfer_cost),
    processing_cost: decimalToNumber(row.processing_cost),
    other_cost: decimalToNumber(row.other_cost),
    parts_cost: decimalToNumber(row.parts_cost),
    total_cost: decimalToNumber(row.total_cost),
    stock_days:
      row.stock_date === null ? null : differenceInCalendarDays(report.captured_at, row.stock_date),
  }))

  return {
    header: {
      id: report.id,
      kind: MonthEndReportKindSchema.parse(report.kind),
      period: report.period,
      captured_at: report.captured_at,
      created_by: report.created_by?.name ?? null,
    },
    summary: buildMonthEndSummary(
      assetRows,
      partRows,
      brandGroup === undefined && assetGroup === undefined,
    ),
    assets,
  }
}

export async function deleteMonthEndReports(ids: number[]): Promise<void> {
  await prisma.monthEndReport.deleteMany({ where: { id: { in: ids } } })
}
