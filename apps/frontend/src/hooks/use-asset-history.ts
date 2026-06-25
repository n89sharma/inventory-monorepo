import { getAssetHistory } from '@/data/api/asset-api'
import useSWR, { mutate } from 'swr'

const assetHistoryKey = (barcode: string) => `asset-history:${barcode}`

export function useAssetHistory(barcode: string, enabled: boolean) {
  return useSWR(enabled ? assetHistoryKey(barcode) : null, () => getAssetHistory(barcode))
}

export function invalidateAssetHistory(barcodes: string[]): void {
  for (const barcode of barcodes) {
    mutate(assetHistoryKey(barcode))
  }
}
