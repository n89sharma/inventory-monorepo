import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useMemo } from 'react'
import type { AssetType } from 'shared-types'

const DEFAULT_ASSET_TYPE_NAME = 'Copier'

export function useDefaultAssetType(): AssetType | null {
  const assetTypes = useReferenceDataStore((state) => state.assetTypes)
  return useMemo(
    () => assetTypes.find((t) => t.asset_type === DEFAULT_ASSET_TYPE_NAME) ?? null,
    [assetTypes],
  )
}
