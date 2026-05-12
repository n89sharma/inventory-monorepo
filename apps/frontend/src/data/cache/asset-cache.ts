import { assetDetailKey } from '@/hooks/use-asset-detail'
import { mutate } from 'swr'

export function invalidateAssetDetails(barcodes: string[]): void {
  for (const barcode of barcodes) {
    mutate(assetDetailKey(barcode))
  }
}
