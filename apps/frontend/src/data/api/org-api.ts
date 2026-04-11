import { api } from '@/data/api/axios-client'
import { apiErrorHandler } from '@/lib/error-handler'
import type { OrgForm } from '@/ui-types/org-form-types'
import { type ApiResponse, type OrgSummary, OrgSummarySchema } from 'shared-types'
import type { AxiosResponse } from 'axios'
import { z } from 'zod'

export async function getOrgs(): Promise<OrgSummary[]> {
  const { data } = await api.get<ApiResponse<OrgSummary[]>>('/organizations')
  if (data.success) return z.array(OrgSummarySchema).parse(data.data)
  throw new Error(data.error.summary)
}

export async function createOrg(form: OrgForm): Promise<ApiResponse<{ id: number }>> {
  return api.post('/organizations', {
    account_number: form.account_number,
    name: form.name,
    contact_name: form.contact_name || null,
    phone: form.phone || null,
    mobile: form.mobile || null,
    primary_email: form.primary_email || null,
    address: form.address || null,
    city: form.city || null,
    province: form.province || null,
    country: form.country || null
  }, { headers: { 'Content-Type': 'application/json' } })
    .then((res: AxiosResponse<{ id: number }>) => ({ success: true as const, data: res.data }))
    .catch(apiErrorHandler<{ id: number }>)
}