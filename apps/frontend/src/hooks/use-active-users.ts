import { useUserStore } from '@/data/store/user-store'
import { useMemo } from 'react'
import type { User } from 'shared-types'

export function useActiveUsers(): User[] {
  const users = useUserStore((state) => state.users)
  return useMemo(() => users.filter((u) => u.is_active), [users])
}
