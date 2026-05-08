import { createOrg as createOrgApi, getOrgs as getOrgsApi } from '@/data/api/org-api'
import type { OrgForm } from '@/ui-types/org-form-types'
import type { ApiResponse, OrgSummary } from 'shared-types'
import { create } from 'zustand'

interface OrgStore {
  organizations: OrgSummary[]
  loading: boolean

  setOrganizations: (organizations: OrgSummary[]) => void
  setLoading: (loading: boolean) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createOrg: (data: OrgForm) => Promise<ApiResponse<any>>
  clearOrganizations: () => void
}

export const useOrgStore = create<OrgStore>((set) => ({
  organizations: [],
  loading: false,

  setOrganizations: (organizations) => set({ organizations }),
  setLoading: (loading) => set({ loading }),
  createOrg: async (data) => {
    const response = await createOrgApi(data)
    if (response.success) {
      const organizations = await getOrgsApi()
      set({ organizations })
    }
    return response
  },
  clearOrganizations: () => set({ organizations: [] })
}))
