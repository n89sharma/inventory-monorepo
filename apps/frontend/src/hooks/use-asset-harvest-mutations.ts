import { harvestAssets, returnHarvestedAssetsToStock } from '@/data/api/asset-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invalidateSearchHarvested } from '@/hooks/use-search-harvested'
import { invalidateSearchOnHand } from '@/hooks/use-search-onhand'

export type HarvestTarget = { id: number; barcode: string }

function invalidateHarvestCaches(assets: HarvestTarget[]) {
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateSearchOnHand()
  invalidateSearchHarvested()
}

async function harvest(assets: HarvestTarget[]) {
  await harvestAssets(assets.map((a) => a.id))
  invalidateHarvestCaches(assets)
}

async function returnToStock(assets: HarvestTarget[]) {
  await returnHarvestedAssetsToStock(assets.map((a) => a.id))
  invalidateHarvestCaches(assets)
}

const mutations = { harvest, returnToStock } as const

export function useAssetHarvestMutations() {
  return mutations
}
