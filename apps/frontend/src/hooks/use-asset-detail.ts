import { getAllAssetDetails } from '@/data/api/asset-api'
import useSWR, { mutate, preload } from 'swr'

export const assetDetailKey = (barcode: string) => `asset:${barcode}`

export function useAssetDetail(barcode: string) {
  return useSWR(assetDetailKey(barcode), () => getAllAssetDetails(barcode))
}

export function preloadAssetDetail(barcode: string) {
  preload(assetDetailKey(barcode), () => getAllAssetDetails(barcode))
}

export function invalidateAssetDetails(barcodes: string[]): void {
  for (const barcode of barcodes) {
    mutate(assetDetailKey(barcode))
  }
}

export function clearAssetDetail(barcode: string): void {
  mutate(assetDetailKey(barcode), undefined, { revalidate: false })
}
