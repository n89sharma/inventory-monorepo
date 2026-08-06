import { useDefaultAssetType } from '@/hooks/use-default-asset-type'
import { useReferenceDataLoaded } from '@/hooks/use-reference-data'
import { useProfileDefaultWarehouse } from '@/hooks/use-profile-default-warehouse'
import { useUsersLoaded } from '@/hooks/use-user'
import { buildAssetSearchPath } from '@/lib/filters/serializers'
import { Navigate } from 'react-router-dom'

const ONHAND_PATH = '/search/onhand'

export function PostLoginLanding(): React.JSX.Element | null {
  const referenceDataLoaded = useReferenceDataLoaded()
  const usersLoaded = useUsersLoaded()
  const defaultWarehouse = useProfileDefaultWarehouse()
  const defaultAssetType = useDefaultAssetType()

  if (!referenceDataLoaded || !usersLoaded) return null

  return (
    <Navigate to={buildAssetSearchPath(ONHAND_PATH, defaultWarehouse, defaultAssetType)} replace />
  )
}
