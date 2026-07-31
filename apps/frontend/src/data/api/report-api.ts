import { api } from '@/data/api/axios-client'
import {
  HeldReportSchema,
  InStockSummaryReportSchema,
  ProfitabilityReportSchema,
  type HeldReport,
  type InStockSummaryReport,
  type ProfitabilityCubeRow,
} from 'shared-types'

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
