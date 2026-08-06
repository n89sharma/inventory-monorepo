import { getAssetByBarcode } from '@/data/api/transfer-api'
import type { AssetSummary } from 'shared-types'
import useSWR from 'swr'

const ASSET_LOOKUP_KEY = 'asset-lookup'
const SKIP_ERROR_TOAST = true

export function useAssetByBarcode(barcode: string) {
  return useSWR<AssetSummary>(
    barcode ? [ASSET_LOOKUP_KEY, barcode] : null,
    ([, code]: [string, string]) => getAssetByBarcode(code, SKIP_ERROR_TOAST),
    { revalidateOnFocus: false, revalidateOnReconnect: false },
  )
}
