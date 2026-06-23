import { api } from '@/data/api/axios-client'
import {
  HoldsByUserReportSchema,
  ProfitabilityReportSchema,
  type HoldsByUserReport,
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
