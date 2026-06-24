import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

export function useActiveWarehouses(): Warehouse[] {
  const warehouses = useReferenceDataStore((state) => state.warehouses)
  return useMemo(() => warehouses.filter((w) => w.is_active), [warehouses])
}
