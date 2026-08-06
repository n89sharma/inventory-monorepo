import { useUsers } from '@/hooks/use-user'
import { useMemo } from 'react'
import type { User } from 'shared-types'

export function useActiveUsers(): User[] {
  const users = useUsers()
  return useMemo(() => users.filter((u) => u.is_active), [users])
}
