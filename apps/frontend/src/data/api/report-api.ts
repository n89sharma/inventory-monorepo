import { api } from '@/data/api/axios-client'
import {
  HoldsByUserReportSchema,
  InStockSummaryReportSchema,
  ProfitabilityReportSchema,
  type HoldsByUserReport,
  type InStockSummaryReport,
  type ProfitabilityCubeRow,
} from 'shared-types'

export async function getProfitabilityReport(year: number): Promise<ProfitabilityCubeRow[]> {
  const { data } = await api.get(`/reports/profitability`, { params: { year } })
  return ProfitabilityReportSchema.parse(data)
}

export async function getHoldsByUserReport(): Promise<HoldsByUserReport> {
  const { data } = await api.get(`/reports/holds-by-user`)
  return HoldsByUserReportSchema.parse(data)
}

export async function getInStockSummaryReport(): Promise<InStockSummaryReport> {
  const { data } = await api.get(`/reports/in-stock-summary`)
  return InStockSummaryReportSchema.parse(data)
}
