import {
  createOrg as createOrgApi,
  mergeOrgs as mergeOrgsApi,
  updateOrg as updateOrgApi,
} from '@/data/api/org-api'
import { invalidateOrgs } from '@/hooks/use-org'
import type { OrgForm } from '@/ui-types/org-form-types'

async function createOrg(form: OrgForm): Promise<{ id: number }> {
  const result = await createOrgApi(form)
  invalidateOrgs()
  return result
}

async function updateOrg(id: number, form: OrgForm): Promise<void> {
  await updateOrgApi(id, form)
  invalidateOrgs()
}

async function mergeOrgs(ids: number[], form: OrgForm): Promise<{ id: number }> {
  const result = await mergeOrgsApi(ids, form)
  invalidateOrgs()
  return result
}

const mutations = {
  createOrg,
  updateOrg,
  mergeOrgs,
} as const

export function useOrgMutations() {
  return mutations
}
