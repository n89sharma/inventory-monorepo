import { useUserStore } from '@/data/store/user-store'
import { useAuth } from '@clerk/react'
import type { User } from 'shared-types'

export function useCurrentUser(): User | null {
  const { userId } = useAuth()
  const users = useUserStore((state) => state.users)
  return users.find((u) => u.clerk_id === userId) ?? null
}
