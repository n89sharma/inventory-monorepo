import {
  getSearchList,
  type NavigationSection,
  type SearchList,
} from '@/ui-types/navigation-context'
import { useLocation, useParams } from 'react-router-dom'

interface AssetDetailsParams {
  section: NavigationSection
  collectionId: string | null
  assetId: string
  searchList: SearchList | null
}

export function useAssetDetailsParams(): AssetDetailsParams {
  const { section, collectionId, assetId } = useParams<{
    section: string
    collectionId: string
    assetId: string
  }>()
  const { pathname } = useLocation()

  if (assetId === undefined)
    throw new Error('Asset ID must be provided for asset detail page route')

  // url:/arrivals/123/789
  if (assetId && section && collectionId) {
    return { section: section as NavigationSection, collectionId, assetId, searchList: null }
  }

  return {
    section: 'search' as NavigationSection,
    collectionId: null,
    assetId,
    searchList: getSearchList(pathname),
  }
}
