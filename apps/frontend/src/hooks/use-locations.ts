import { getLocationsByWarehouse } from '@/data/api/asset-api'
import { getLocations } from '@/data/api/location-api'
import type { AssetLocation } from 'shared-types'
import useSWR from 'swr'

const LOCATIONS_KEY = 'locations'
const WAREHOUSE_LOCATIONS_KEY = 'warehouse-locations'

export function useLocations() {
  return useSWR(LOCATIONS_KEY, getLocations)
}

export function useWarehouseLocations(warehouseId: number | null) {
  return useSWR<AssetLocation[]>(
    warehouseId === null ? null : [WAREHOUSE_LOCATIONS_KEY, warehouseId],
    ([, id]: [string, number]) => getLocationsByWarehouse(id),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )
}
