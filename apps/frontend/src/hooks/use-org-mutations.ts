import { createOrg as createOrgApi } from '@/data/api/org-api'
import { invalidateOrgs } from '@/hooks/use-org'
import type { OrgForm } from '@/ui-types/org-form-types'

async function createOrg(form: OrgForm): Promise<{ id: number }> {
  const result = await createOrgApi(form)
  invalidateOrgs()
  return result
}

const mutations = {
  createOrg,
} as const

export function useOrgMutations() {
  return mutations
}
