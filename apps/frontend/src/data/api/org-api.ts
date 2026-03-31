import { api } from '@/data/api/axios-client'
import { type ApiResponse, type OrgSummary, OrgSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getOrgs(): Promise<OrgSummary[]> {
  const { data } = await api.get<ApiResponse<OrgSummary[]>>('/organizations')
  if (data.success) return z.array(OrgSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}