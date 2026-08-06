import { useAssetTypes } from '@/hooks/use-reference-data'
import { useMemo } from 'react'
import type { AssetType } from 'shared-types'

const DEFAULT_ASSET_TYPE_NAME = 'Copier'

export function useDefaultAssetType(): AssetType | null {
  const assetTypes = useAssetTypes()
  return useMemo(
    () => assetTypes.find((t) => t.asset_type === DEFAULT_ASSET_TYPE_NAME) ?? null,
    [assetTypes],
  )
}
