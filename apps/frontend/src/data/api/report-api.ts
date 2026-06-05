import { api } from '@/data/api/axios-client'
import { ProfitabilityReportSchema, type ProfitabilityCubeRow } from 'shared-types'

export async function getProfitabilityReport(year: number): Promise<ProfitabilityCubeRow[]> {
  const { data } = await api.get(`/reports/profitability`, { params: { year } })
  return ProfitabilityReportSchema.parse(data)
}
