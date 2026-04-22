import { produce } from 'immer'
import type { NavigationSection } from '@/ui-types/navigation-context'
import { create } from 'zustand'

interface NavigationStore {
  lastPaths: Record<NavigationSection, string | null>
  setLastPath: (section: NavigationSection, path: string) => void
  clearLastPath: (section: NavigationSection) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  lastPaths: {
    arrivals: null,
    transfers: null,
    departures: null,
    holds: null,
    invoices: null,
    search: null,
    home: null
  },
  setLastPath: (section, path) =>
    set(produce(draft => { draft.lastPaths[section] = path })),
  clearLastPath: (section) =>
    set(produce(draft => { draft.lastPaths[section] = null }))
}))
