import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useUserStore } from '@/data/store/user-store'
import { useAuth } from '@clerk/react'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

export function useDefaultWarehouseSelection(): Warehouse[] {
  const { userId } = useAuth()
  const users = useUserStore(state => state.users)
  const warehouses = useReferenceDataStore(state => state.warehouses)

  return useMemo(() => {
    const activeWarehouses = warehouses.filter(w => w.is_active)
    const currentUser = users.find(u => u.clerk_id === userId)
    const profileDefault = currentUser?.default_warehouse_id != null
      ? activeWarehouses.find(w => w.id === currentUser.default_warehouse_id)
      : undefined
    return profileDefault ? [profileDefault] : activeWarehouses
  }, [userId, users, warehouses])
}
