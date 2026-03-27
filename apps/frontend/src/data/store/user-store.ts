import type { User } from 'shared-types'
import { create } from 'zustand'

interface UserStore {
  users: User[]
  setUsers: (users: User[]) => void
}

export const useUserStore = create<UserStore>(set => ({
  users: [],
  setUsers: users => set({ users })
}))
