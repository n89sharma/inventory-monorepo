import { api } from '@/data/api/axios-client'
import type { OrgForm } from '@/ui-types/org-form-types'
import { type OrgSummary, OrgSummarySchema } from 'shared-types'
import { z } from 'zod'

export async function getOrgs(): Promise<OrgSummary[]> {
  const { data } = await api.get<{ success: true; data: OrgSummary[] }>('/organizations')
  return z.array(OrgSummarySchema).parse(data.data)
}

export async function createOrg(form: OrgForm): Promise<{ id: number }> {
  return (await api.post<{ id: number }>('/organizations', {
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
  })).data
}
