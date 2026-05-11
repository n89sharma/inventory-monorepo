import { getUsers as getUsersApi, setUserRole as setUserRoleApi, toggleUserActive as toggleUserActiveApi } from '@/data/api/user-api'
import type { AppRole, User } from 'shared-types'
import { create } from 'zustand'

interface UserStore {
  users: User[]
  setUsers: (users: User[]) => void
  setUserRole: (userId: number, role: AppRole) => Promise<void>
  toggleUserActive: (userId: number, isActive: boolean) => Promise<void>
}

export const useUserStore = create<UserStore>(set => ({
  users: [],
  setUsers: users => set({ users }),

  setUserRole: async (userId, role) => {
    await setUserRoleApi(userId, role)
    set({ users: await getUsersApi() })
  },

  toggleUserActive: async (userId, isActive) => {
    await toggleUserActiveApi(userId, isActive)
    set({ users: await getUsersApi() })
  },
}))
