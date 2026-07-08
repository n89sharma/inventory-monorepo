import { useReferenceDataStore } from '@/data/store/reference-data-store'
import { useDefaultAssetType } from '@/hooks/use-default-asset-type'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { buildAssetSearchPath } from '@/lib/filters/serializers'
import { Navigate } from 'react-router-dom'

const ONHAND_PATH = '/search/onhand'

export function PostLoginLanding(): React.JSX.Element | null {
  const loaded = useReferenceDataStore((state) => state.loaded)
  const defaultWarehouse = useProfileDefaultWarehouse()
  const defaultAssetType = useDefaultAssetType()

  if (!loaded) return null

  return (
    <Navigate to={buildAssetSearchPath(ONHAND_PATH, defaultWarehouse, defaultAssetType)} replace />
  )
}
