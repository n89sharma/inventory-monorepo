import { getAssetHistory } from '@/data/api/asset-api'
import useSWR from 'swr'

export function useAssetHistory(barcode: string, enabled: boolean) {
  return useSWR(
    enabled ? `asset-history:${barcode}` : null,
    () => getAssetHistory(barcode)
  )
}
