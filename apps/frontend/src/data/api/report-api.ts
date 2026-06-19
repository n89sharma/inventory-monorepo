import { api } from '@/data/api/axios-client'
import {
  HoldsBySalespersonReportSchema,
  ProfitabilityReportSchema,
  type HoldsBySalespersonReport,
  type ProfitabilityCubeRow,
} from 'shared-types'

export async function getProfitabilityReport(year: number): Promise<ProfitabilityCubeRow[]> {
  const { data } = await api.get(`/reports/profitability`, { params: { year } })
  return ProfitabilityReportSchema.parse(data)
}

export async function getHoldsBySalespersonReport(): Promise<HoldsBySalespersonReport> {
  const { data } = await api.get(`/reports/holds-by-salesperson`)
  return HoldsBySalespersonReportSchema.parse(data)
}
