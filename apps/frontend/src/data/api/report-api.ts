import { api } from '@/data/api/axios-client'
import {
  CreateMonthEndReportResultSchema,
  DeleteMonthEndReportsSchema,
  HeldReportSchema,
  InStockSummaryReportSchema,
  MonthEndReportDetailSchema,
  MonthEndReportListSchema,
  MonthEndScheduleSchema,
  ProfitabilityReportSchema,
  UpdateMonthEndScheduleSchema,
  type AssetGroup,
  type BrandGroup,
  type DeleteMonthEndReports,
  type HeldReport,
  type InStockSummaryReport,
  type MonthEndReportDetail,
  type MonthEndReportListItem,
  type MonthEndSchedule,
  type ProfitabilityCubeRow,
  type UpdateMonthEndSchedule,
} from 'shared-types'

const MONTH_END_PATH = '/reports/month-end'

export async function getMonthEndReports(): Promise<MonthEndReportListItem[]> {
  const { data } = await api.get(MONTH_END_PATH)
  return MonthEndReportListSchema.parse(data)
}

export type MonthEndReportFilters = {
  brandGroup: BrandGroup | null
  assetGroup: AssetGroup | null
  warehouseIds: number[]
}

export async function getMonthEndReport(
  id: number,
  { brandGroup, assetGroup, warehouseIds }: MonthEndReportFilters,
): Promise<MonthEndReportDetail> {
  const { data } = await api.get(`${MONTH_END_PATH}/${id}`, {
    params: {
      brandGroup: brandGroup ?? undefined,
      assetGroup: assetGroup ?? undefined,
      warehouseIds,
    },
  })
  return MonthEndReportDetailSchema.parse(data)
}

export async function createMonthEndReport(): Promise<number> {
  const { data } = await api.post(MONTH_END_PATH)
  return CreateMonthEndReportResultSchema.parse(data).id
}

export async function deleteMonthEndReports(ids: number[]): Promise<void> {
  const deleteMonthEndReportsBody = DeleteMonthEndReportsSchema.parse({
    ids,
  } satisfies DeleteMonthEndReports)
  await api.post(`${MONTH_END_PATH}/bulk-delete`, deleteMonthEndReportsBody)
}

export async function getMonthEndSchedule(): Promise<MonthEndSchedule> {
  const { data } = await api.get(`${MONTH_END_PATH}/schedule`)
  return MonthEndScheduleSchema.parse(data)
}

export async function updateMonthEndSchedule(dayOfMonth: number | null): Promise<MonthEndSchedule> {
  const updateMonthEndScheduleBody = UpdateMonthEndScheduleSchema.parse({
    day_of_month: dayOfMonth,
  } satisfies UpdateMonthEndSchedule)
  const { data } = await api.put(`${MONTH_END_PATH}/schedule`, updateMonthEndScheduleBody)
  return MonthEndScheduleSchema.parse(data)
}

export async function getProfitabilityReport(year: number): Promise<ProfitabilityCubeRow[]> {
  const { data } = await api.get(`/reports/profitability`, { params: { year } })
  return ProfitabilityReportSchema.parse(data)
}

export async function getHeldReport(): Promise<HeldReport> {
  const { data } = await api.get('/reports/held')
  return HeldReportSchema.parse(data)
}

export async function getInStockSummaryReport(): Promise<InStockSummaryReport> {
  const { data } = await api.get(`/reports/in-stock-summary`)
  return InStockSummaryReportSchema.parse(data)
}
