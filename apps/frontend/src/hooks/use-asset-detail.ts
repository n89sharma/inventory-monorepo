import { getAllAssetDetails, getAssetDetail } from '@/data/api/asset-api'
import type { AssetCost } from 'shared-types'
import useSWR, { mutate, preload } from 'swr'

const ASSET_PRICING_KEY_PREFIX = 'asset-pricing:'

export const assetDetailKey = (barcode: string) => `asset:${barcode}`

export type AssetPricing = Record<string, AssetCost>

const assetPricingKey = (barcodes: string[]) =>
  `${ASSET_PRICING_KEY_PREFIX}${[...barcodes].sort().join(',')}`

async function fetchAssetPricing(barcodes: string[]): Promise<AssetPricing> {
  const results = await Promise.allSettled(barcodes.map((barcode) => getAssetDetail({ barcode })))
  const pricing: AssetPricing = {}
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') pricing[barcodes[index]] = result.value.cost
  })
  return pricing
}

export function useAssetPricing(barcodes: string[]) {
  return useSWR(assetPricingKey(barcodes), () => fetchAssetPricing(barcodes))
}

export function invalidateAssetPricing(): void {
  mutate((key) => typeof key === 'string' && key.startsWith(ASSET_PRICING_KEY_PREFIX))
}

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
