import { useActiveWarehouses } from '@/hooks/use-active-warehouses'
import { useCurrentUser } from '@/hooks/use-current-user'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

export function useProfileDefaultWarehouse(): Warehouse | null {
  const currentUser = useCurrentUser()
  const activeWarehouses = useActiveWarehouses()

  return useMemo(() => {
    if (currentUser?.default_warehouse_id == null) return null
    return activeWarehouses.find((w) => w.id === currentUser.default_warehouse_id) ?? null
  }, [currentUser, activeWarehouses])
}
