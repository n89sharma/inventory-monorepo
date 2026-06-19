import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useUserStore } from '@/data/store/user-store'
import { useAuth } from '@clerk/react'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

export function useDefaultWarehouseSelection(): Warehouse[] {
  const { userId } = useAuth()
  const users = useUserStore(state => state.users)
  const activeWarehouses = useActiveWarehouses()

  return useMemo(() => {
    const currentUser = users.find(u => u.clerk_id === userId)
    const profileDefault = currentUser?.default_warehouse_id != null
      ? activeWarehouses.find(w => w.id === currentUser.default_warehouse_id)
      : undefined
    return profileDefault ? [profileDefault] : activeWarehouses
  }, [userId, users, activeWarehouses])
}
