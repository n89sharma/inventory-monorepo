import { useWarehouses } from '@/hooks/use-reference-data'
import { useMemo } from 'react'
import type { Warehouse } from 'shared-types'

export function useActiveWarehouses(): Warehouse[] {
  const warehouses = useWarehouses()
  return useMemo(() => warehouses.filter((w) => w.is_active), [warehouses])
}
