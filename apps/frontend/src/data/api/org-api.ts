import { api } from '@/data/api/axios-client'
import type { OrgForm } from '@/ui-types/org-form-types'
import {
  type MergeOrg,
  MergeOrgSchema,
  type CreateOrg,
  CreateOrgSchema,
  type OrgDetail,
  OrgDetailSchema,
  type OrgMergePreview,
  OrgMergePreviewSchema,
  type UpdateOrg,
  UpdateOrgSchema,
} from 'shared-types'
import { z } from 'zod'

const CreateOrgResponseSchema = z.object({ id: z.number() })

export async function getOrgs(): Promise<OrgDetail[]> {
  const { data } = await api.get<OrgDetail[]>('/organizations')
  return z.array(OrgDetailSchema).parse(data)
}

export async function createOrg(form: OrgForm): Promise<{ id: number }> {
  const createOrgBody = CreateOrgSchema.parse({
    account_number: form.account_number || null,
    name: form.name,
    contact_name: form.contact_name || null,
    phone: form.phone || null,
    mobile: form.mobile || null,
    primary_email: form.primary_email || null,
    address: form.address || null,
    city: form.city || null,
    province: form.province || null,
    country: form.country || null,
  } satisfies CreateOrg)
  const { data } = await api.post<{ id: number }>('/organizations', createOrgBody)
  return CreateOrgResponseSchema.parse(data)
}

export async function updateOrg(id: number, form: OrgForm): Promise<void> {
  const updateOrgBody = UpdateOrgSchema.parse({
    account_number: form.account_number || null,
    name: form.name,
    contact_name: form.contact_name || null,
    phone: form.phone || null,
    mobile: form.mobile || null,
    primary_email: form.primary_email || null,
    address: form.address || null,
    city: form.city || null,
    province: form.province || null,
    country: form.country || null,
  } satisfies UpdateOrg)
  await api.patch(`/organizations/${id}`, updateOrgBody)
}

export async function previewOrgMerge(ids: number[]): Promise<OrgMergePreview> {
  const { data } = await api.post<OrgMergePreview>('/organizations/merge/preview', { ids })
  return OrgMergePreviewSchema.parse(data)
}

export async function mergeOrgs(ids: number[], form: OrgForm): Promise<{ id: number }> {
  const mergeOrgsBody = MergeOrgSchema.parse({
    ids,
    organization: {
      account_number: form.account_number || null,
      name: form.name,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      mobile: form.mobile || null,
      primary_email: form.primary_email || null,
      address: form.address || null,
      city: form.city || null,
      province: form.province || null,
      country: form.country || null,
    },
  } satisfies MergeOrg)
  const { data } = await api.post<{ id: number }>('/organizations/merge', mergeOrgsBody)
  return CreateOrgResponseSchema.parse(data)
}
