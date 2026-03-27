import type { OrgSummary } from 'shared-types'
import { create } from 'zustand'

interface OrgStore {
  organizations: OrgSummary[]
  loading: boolean

  setOrganizations: (organizations: OrgSummary[]) => void
  setLoading: (loading: boolean) => void

  clearOrganizations: () => void
}

export const useOrgStore = create<OrgStore>((set) => ({
  organizations: [],
  loading: false,

  setOrganizations: (organizations) => set({ organizations }),
  setLoading: (loading) => set({ loading }),
  clearOrganizations: () => set({ organizations: [] })
}))