import { api } from '@/data/api/axios-client'
import { type OrgSummary, OrgSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getOrgs(): Promise<OrgSummary[]> {
  const res = await api.get('/organizations')
  return z.array(OrgSummarySchema).parse(res.data)
}