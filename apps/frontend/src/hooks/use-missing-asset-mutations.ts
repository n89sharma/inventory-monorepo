import { markAssetsMissing, returnMissingAssetsToStock } from '@/data/api/asset-api'
import { invalidateAssetDetails } from '@/hooks/use-asset-detail'
import type { AssetStatusTarget } from '@/hooks/use-asset-harvest-mutations'
import { invalidateDepartureDetails, invalidateDepartureLists } from '@/hooks/use-departure'
import { invalidateSearchMissing } from '@/hooks/use-search-missing'
import { invalidateSearchOnHand } from '@/hooks/use-search-onhand'
import { invalidateTransferDetails, invalidateTransferLists } from '@/hooks/use-transfer'

async function markMissing(assets: AssetStatusTarget[]) {
  await markAssetsMissing(assets.map((a) => a.id))
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateSearchMissing()
  invalidateSearchOnHand()
  invalidateTransferDetails()
  invalidateTransferLists()
}

async function returnToStock(assets: AssetStatusTarget[]) {
  await returnMissingAssetsToStock(assets.map((a) => a.id))
  invalidateAssetDetails(assets.map((a) => a.barcode))
  invalidateSearchMissing()
  invalidateSearchOnHand()
  invalidateTransferDetails()
  invalidateTransferLists()
  invalidateDepartureDetails()
  invalidateDepartureLists()
}

const mutations = { markMissing, returnToStock } as const

export function useMissingAssetMutations() {
  return mutations
}
