import { harvestAssets, returnHarvestedAssetsToStock } from '@/data/api/asset-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import { invalidateSearchHarvested } from '@/hooks/use-search-harvested'
import { invalidateSearchOnHand } from '@/hooks/use-search-onhand'

export type AssetStatusTarget = { id: number; barcode: string }

function invalidateHarvestCaches(assets: AssetStatusTarget[]) {
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateSearchOnHand()
  invalidateSearchHarvested()
}

async function harvest(assets: AssetStatusTarget[]) {
  await harvestAssets(assets.map((a) => a.id))
  invalidateHarvestCaches(assets)
}

async function returnToStock(assets: AssetStatusTarget[]) {
  await returnHarvestedAssetsToStock(assets.map((a) => a.id))
  invalidateHarvestCaches(assets)
}

const mutations = { harvest, returnToStock } as const

export function useAssetHarvestMutations() {
  return mutations
}
