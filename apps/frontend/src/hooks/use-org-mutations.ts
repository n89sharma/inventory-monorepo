import { createOrg as createOrgApi, updateOrg as updateOrgApi } from '@/data/api/org-api'
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

const mutations = {
  createOrg,
  updateOrg,
} as const

export function useOrgMutations() {
  return mutations
}
