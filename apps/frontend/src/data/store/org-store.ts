import { createOrg as createOrgApi, getOrgs as getOrgsApi } from '@/data/api/org-api'
import type { OrgForm } from '@/ui-types/org-form-types'
import type { OrgSummary } from 'shared-types'
import { create } from 'zustand'

interface OrgStore {
  organizations: OrgSummary[]
  loading: boolean

  setOrganizations: (organizations: OrgSummary[]) => void
  setLoading: (loading: boolean) => void
  createOrg: (data: OrgForm) => Promise<{ id: number }>
  clearOrganizations: () => void
}

export const useOrgStore = create<OrgStore>((set) => ({
  organizations: [],
  loading: false,

  setOrganizations: (organizations) => set({ organizations }),
  setLoading: (loading) => set({ loading }),
  createOrg: async (data) => {
    const result = await createOrgApi(data)
    set({ organizations: await getOrgsApi() })
    return result
  },
  clearOrganizations: () => set({ organizations: [] }),
}))
