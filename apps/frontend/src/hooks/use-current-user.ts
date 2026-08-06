import { useUsers } from '@/hooks/use-user'
import { useAuth } from '@clerk/react'
import type { User } from 'shared-types'

export function useCurrentUser(): User | null {
  const { userId } = useAuth()
  const users = useUsers()
  return users.find((u) => u.clerk_id === userId) ?? null
}
